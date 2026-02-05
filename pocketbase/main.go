package main

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"

	// _ "app/migrations"

	// _ "github.com/joho/godotenv/autoload"
	// "github.com/labstack/echo"
	// "github.com/labstack/echo/v5/middleware"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/cron"
	"github.com/pocketbase/pocketbase/tools/security"
	"github.com/pocketbase/pocketbase/tools/types"
	"golang.org/x/net/html"
)

func isDevEnv() bool {
	isGoRun := strings.HasPrefix(os.Args[0], os.TempDir())
	return isGoRun
}

var unauthorizedErr = apis.NewUnauthorizedError("Invalid or expired OTP token", nil)
var notFoundErr = apis.NewNotFoundError("User not found", nil)
var badRequestErr = apis.NewBadRequestError("Invalid request", nil)

const WEB_URL = "https://pre-rt.prod.appadem.in"
const API_URL = "https://pre-rt-api.prod.appadem.in"

// const WEB_URL = "http://localhost:5173"
const TREATMENT_END_FORM_ID = "p8ow7xj8h4uuv43"
const TREATMENT_END_QUESTION_ID = "242u8ha0yn8m06d"

func stripHTML(input string) string {
	doc, err := html.Parse(strings.NewReader(input))
	if err != nil {
		return input // fallback to the original string if parsing fails
	}
	var buf bytes.Buffer
	var f func(*html.Node)
	f = func(n *html.Node) {
		if n.Type == html.TextNode {
			buf.WriteString(n.Data)
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(doc)
	return html.UnescapeString(buf.String())
}

var placeholderRe = regexp.MustCompile(`\{\w+\}`)

func compareOptionValues(str1, str2 string) bool {
	if str1 == "" || str2 == "" {
		return false
	}
	normalize := func(s string) string {
		return placeholderRe.ReplaceAllString(s, "{PLACEHOLDER}")
	}
	return normalize(str1) == normalize(str2)
}

func createOtp(app *pocketbase.PocketBase, user *core.Record) (*core.Record, error) {
	return createOtpWithExpiration(app, user, false)
}

func getLastCreatedUserWithDiagnosis(app *pocketbase.PocketBase, diagnosis string) (*core.Record, error) {
	users, err := app.FindRecordsByFilter("users", "diagnosis = {:diagnosis}", "-created", 1, 0, dbx.Params{
		"diagnosis": diagnosis,
	})
	if err != nil {
		println("error", err)
		return nil, err
	}

	if len(users) == 0 {
		return nil, nil
	}

	return users[0], nil
}

func createOtpWithExpiration(app *pocketbase.PocketBase, user *core.Record, useLongExpiration bool) (*core.Record, error) {
	collection, err := app.FindCollectionByNameOrId("otp")
	if err != nil {
		return nil, err
	}

	record := core.NewRecord(collection)

	if useLongExpiration {
		record.Set("expiration", time.Now().AddDate(0, 0, 7))
	} else {
		record.Set("expiration", time.Now().Add(time.Hour))
	}

	record.Set("user", user.Id)
	record.Set("attempts", 0)
	record.Set("password", security.RandomStringWithAlphabet(6, "0123456789"))

	if err := app.Save(record); err != nil {
		return nil, err
	}
	return record, nil
}

func sendText(phoneNumber string, text string) error {
	if isDevEnv() {
		// just print the message to console
		log.Println("Sending message to", phoneNumber, ":", text)
		return nil
	}
	// replace 0 with +46 for phoneNumber
	phoneNumber = strings.Replace(phoneNumber, "0", "+46", 1)

	apiUsername := os.Getenv("ELKS_API_USERNAME")
	apiPassword := os.Getenv("ELKS_API_PASSWORD")
	auth := base64.StdEncoding.EncodeToString([]byte(apiUsername + ":" + apiPassword))

	// Prepare data
	data := url.Values{}
	data.Set("from", "StudiePreRT")
	data.Set("to", phoneNumber)
	data.Set("message", text)

	// Create HTTP request
	req, err := http.NewRequest("POST", "https://api.46elks.com/a1/sms", strings.NewReader(data.Encode()))
	if err != nil {
		fmt.Println("Error creating request:", err)
		return err
	}

	// Set headers
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error sending request:", err)
		return err
	}
	defer resp.Body.Close()

	// Read response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading response:", err)
		return err
	}

	fmt.Println("Response:", string(body))

	return nil
}

func sendTreatmentEndReminder(app *pocketbase.PocketBase, user *core.Record) {
	link := WEB_URL + "/forms/" + TREATMENT_END_FORM_ID

	sendText(user.GetString("phoneNumber"), "Hej! Det är nu 5 veckor efter behandlingsstart, du kan fylla i slutdatum här: "+link)
}

func answeredQuestionnaire(answeredDate time.Time, occurance string) bool {
	var nextDueDate time.Time

	switch occurance {
	case "daily":
		// Add one day to the answered date, but ignore the time
		nextDueDate = answeredDate.AddDate(0, 0, 1) // Add one day
	case "weekly":
		weekday := answeredDate.Weekday()
		var daysUntilMonday int
		if weekday == time.Sunday {
			daysUntilMonday = 1
		} else {
			daysUntilMonday = (8 - int(weekday)) % 7
		}
		nextDueDate = answeredDate.AddDate(0, 0, daysUntilMonday)
	default:
		// Optionally handle unexpected occurrence value
		return false
	}
	nextDueDate = time.Date(nextDueDate.Year(), nextDueDate.Month(), nextDueDate.Day(), 0, 0, 0, 0, nextDueDate.Location())

	// Get the current date
	currentDate := time.Now()

	return nextDueDate.After(currentDate)
}

func userShouldBeRemindedAboutTreatmentEnd(user *core.Record) bool {
	// does user already have a treatment end date?
	treatmentEnd := user.GetDateTime("treatmentEnd").Time()

	// if its set no need to be reminded
	if !treatmentEnd.IsZero() {
		return false
	}
	// send reminder if day is 5 weeks after treatment start
	treatmentStart := user.GetDateTime("treatmentStart").Time()
	fiveWeeksAfterTreatmentStart := treatmentStart.AddDate(0, 0, 35)

	today := time.Now()

	// check if today is the day 5 weeks after treatment start
	if today.Year() == fiveWeeksAfterTreatmentStart.Year() && today.YearDay() == fiveWeeksAfterTreatmentStart.YearDay() {
		return true
	}

	return false
}

func startDateForDailyQuestionnaires(user *core.Record) *time.Time {
	treatmentStart := user.GetDateTime("treatmentStart").Time()
	treatmentEnd := user.GetDateTime("treatmentEnd").Time()

	if treatmentStart.IsZero() {
		return nil
	}

	if user.GetString("type") == "PRE" {
		temp := treatmentStart.AddDate(0, 0, -14)
		return &temp
	}

	if !treatmentEnd.IsZero() {
		temp := treatmentEnd.AddDate(0, 0, 14)
		return &temp
	}

	return nil
}

func endDateForDailyQuestionnaires(user *core.Record) *time.Time {
	treatmentEnd := user.GetDateTime("treatmentEnd").Time()

	if treatmentEnd.IsZero() {
		return nil
	}

	if user.GetString("type") == "PRE" {
		return &treatmentEnd
	}

	temp := treatmentEnd.AddDate(0, 0, 56)
	return &temp
}

func userShouldBeNotified(user *core.Record) bool {
	startDate := startDateForDailyQuestionnaires(user)
	endDate := endDateForDailyQuestionnaires(user)

	if startDate == nil || endDate == nil {
		return false
	}

	return time.Now().After(*startDate) && time.Now().Before(*endDate)
}

func checkAndSendNotification(app *pocketbase.PocketBase, user *core.Record, questionnaire *core.Record) {
	answers, _ := app.FindRecordsByFilter("answers", "user = {:user} && questionnaire = {:questionnaire}", "-date", 1, 0, dbx.Params{
		"user":          user.Id,
		"questionnaire": questionnaire.Id,
	})

	for _, answer := range answers {
		if answer != nil && answeredQuestionnaire(answer.Get("date").(types.DateTime).Time(), questionnaire.Get("occurrence").(string)) {
			// log.Println("Already answered")
			return
		}
	}

	date := time.Now().Format("2006-01-02")
	link := WEB_URL + "/forms/" + questionnaire.Id + "?date=" + date

	sendText(user.GetString("phoneNumber"), "Hej! Glöm inte att svara på din enkät idag!"+link)
}

func main() {
	app := pocketbase.New()

	isGoRun := strings.HasPrefix(os.Args[0], os.TempDir())

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: isGoRun,
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		scheduler := cron.New()

		se.Router.Bind(apis.Gzip())

		se.Router.GET("/data-export/{id}", func(e *core.RequestEvent) error {
			// if !e.HasSuperuserAuth() {
			// 	return apis.NewUnauthorizedError("Unauthorized", nil)
			// }

			exportRecord, err := app.FindRecordById("exports", e.Request.PathValue("id"))
			if err != nil {
				return apis.NewNotFoundError("Export not found", nil)
			}
			// delete export record
			defer app.Delete(exportRecord)

			// Fetch all answers records.
			answers, err := app.FindRecordsByFilter("answers", "", "", 0, 0, nil)
			if err != nil {
				return err
			}
			// Group answers by questionnaire id; if empty, use "unknown".
			groupedAnswers := make(map[string][]*core.Record)
			for _, answer := range answers {
				qid := answer.GetString("questionnaire")
				if qid == "" {
					qid = "unknown"
				}
				groupedAnswers[qid] = append(groupedAnswers[qid], answer)
			}

			// Fetch all questionnaires.
			questionnaireRecs, err := app.FindRecordsByFilter("questionnaires", "", "", 0, 0, nil)
			if err != nil {
				return err
			}
			questionnairesMap := make(map[string]*core.Record)
			for _, q := range questionnaireRecs {
				questionnairesMap[q.Id] = q
			}

			// Fetch all questions.
			questionRecs, err := app.FindRecordsByFilter("questions", "", "", 0, 0, nil)
			if err != nil {
				return err
			}
			// Build mapping for question details.
			type QuestionInfo struct {
				Name    string   // rich text stripped (assume you have a helper stripHTML already defined)
				Type    string   // e.g. "multipleChoice"
				Options []string // for multipleChoice, a list of possible options
			}
			questionInfoMap := make(map[string]QuestionInfo)
			// (Assume questionOptions have been fetched and processed similarly elsewhere.)
			questionOptionsCache := make(map[string][]string)
			for _, qRec := range questionRecs {
				qi := QuestionInfo{
					Name: stripHTML(qRec.GetString("text")),
					Type: qRec.GetString("type"),
				}
				if qi.Type == "multipleChoice" {
					optionsID := qRec.GetString("options")
					if optionsID != "" {
						if opts, ok := questionOptionsCache[optionsID]; ok {
							qi.Options = opts
						} else {
							qOptRec, err := app.FindRecordById("questionOptions", optionsID)
							if err == nil && qOptRec != nil {
								rawOpts := qOptRec.Get("value")
								var opts []string
								// rawOpts is of type types.JSONRaw. Convert accordingly.
								if raw, ok := rawOpts.(types.JSONRaw); ok {
									if err := json.Unmarshal(raw, &opts); err != nil {
										log.Println("Failed to unmarshal options:", err)
									} else {
										qi.Options = opts
										questionOptionsCache[optionsID] = opts
									}
								} else {
									log.Println("rawOpts is not types.JSONRaw")
								}
							}
						}
					}
				}
				questionInfoMap[qRec.Id] = qi
			}

			var buf bytes.Buffer
			zipWriter := zip.NewWriter(&buf)

			// Process each questionnaire group.
			for qid, recs := range groupedAnswers {
				baseHeaders := []string{"id", "user", "started", "date", "created", "updated"}
				var questionIDs []string
				// If questionnaire exists, use its "questions" field (assumed to be []string).
				if qid != "unknown" {
					if qRec, ok := questionnairesMap[qid]; ok {
						if qs, ok := qRec.Get("questions").([]string); ok {
							questionIDs = qs
						}
					}
				}
				// Fallback: union of keys in answers.
				if len(questionIDs) == 0 {
					keysSet := make(map[string]struct{})
					for _, rec := range recs {
						ansStr := rec.GetString("answers")
						var ansMap map[string]interface{}
						if err := json.Unmarshal([]byte(ansStr), &ansMap); err == nil {
							for key := range ansMap {
								keysSet[key] = struct{}{}
							}
						}
					}
					for key := range keysSet {
						questionIDs = append(questionIDs, key)
					}
					sort.Strings(questionIDs)
				}

				// Expand columns: for multipleChoice questions, create a column per option.
				expandedIDHeaders := []string{}
				expandedHumanHeaders := []string{}
				for _, qKey := range questionIDs {
					if qi, ok := questionInfoMap[qKey]; ok && qi.Type == "multipleChoice" && len(qi.Options) > 0 {
						for _, opt := range qi.Options {
							expandedIDHeaders = append(expandedIDHeaders, qKey+"_"+opt)
							expandedHumanHeaders = append(expandedHumanHeaders, qi.Name+" - "+opt)
						}
					} else {
						expandedIDHeaders = append(expandedIDHeaders, qKey)
						if qi, ok := questionInfoMap[qKey]; ok {
							expandedHumanHeaders = append(expandedHumanHeaders, qi.Name)
						} else {
							expandedHumanHeaders = append(expandedHumanHeaders, qKey)
						}
					}
				}
				idHeaders := append(baseHeaders, expandedIDHeaders...)
				humanHeaders := append(baseHeaders, expandedHumanHeaders...)

				questionnaireName := qid
				if qRec, ok := questionnairesMap[qid]; ok {
					questionnaireName = qRec.GetString("name")
					questionnaireName = strings.ReplaceAll(strings.ToLower(questionnaireName), " ", "_")
				}
				idFileName := fmt.Sprintf("%s_ids.csv", questionnaireName)
				humanFileName := fmt.Sprintf("%s_names.csv", questionnaireName)

				// Build rows for CSV.
				var rows [][]string
				for _, rec := range recs {
					baseRow := []string{
						rec.GetString("id"),
						rec.GetString("user"),
						rec.GetString("started"),
						rec.GetString("date"),
						rec.GetString("created"),
						rec.GetString("updated"),
					}
					var expandedValues []string
					ansStr := rec.GetString("answers")
					var ansMap map[string]interface{}
					if err := json.Unmarshal([]byte(ansStr), &ansMap); err != nil {
						ansMap = map[string]interface{}{}
					}
					// For each question in order, expand the answer.
					for _, qKey := range questionIDs {
						if qi, ok := questionInfoMap[qKey]; ok && qi.Type == "multipleChoice" && len(qi.Options) > 0 {
							// Parse the stored answer into a slice of strings.
							var selectedAnswers []string
							if rawVal, exists := ansMap[qKey]; exists {
								switch v := rawVal.(type) {
								case []interface{}:
									for _, item := range v {
										selectedAnswers = append(selectedAnswers, fmt.Sprintf("%v", item))
									}
								default:
									selectedAnswers = append(selectedAnswers, fmt.Sprintf("%v", rawVal))
								}
							}
							// For each option in the question, check if any selected answer matches (using compareOptionValues).
							for _, opt := range qi.Options {
								// If option text contains "{AMOUNT}", extract the numeric value.
								if strings.Contains(opt, "{AMOUNT}") {
									var valueFound string = ""
									for _, ansVal := range selectedAnswers {
										if compareOptionValues(opt, ansVal) {
											// Extract digits inside curly braces.
											re := regexp.MustCompile(`\{(\d+)\}`)
											matches := re.FindStringSubmatch(ansVal)
											if len(matches) > 1 {
												valueFound = matches[1]
											}
											break
										}
									}
									if valueFound != "" {
										expandedValues = append(expandedValues, valueFound)
									} else {
										expandedValues = append(expandedValues, "0")
									}
								} else {
									// For non-placeholder options, output "1" if matched, "0" otherwise.
									matched := false
									for _, ansVal := range selectedAnswers {
										if compareOptionValues(opt, ansVal) {
											matched = true
											break
										}
									}
									if matched {
										expandedValues = append(expandedValues, "1")
									} else {
										expandedValues = append(expandedValues, "0")
									}
								}
							}
						} else {
							// For non-multipleChoice questions.
							if val, exists := ansMap[qKey]; exists {
								expandedValues = append(expandedValues, fmt.Sprintf("%v", val))
							} else {
								expandedValues = append(expandedValues, "")
							}
						}
					}
					fullRow := append(baseRow, expandedValues...)
					rows = append(rows, fullRow)
				}

				// Helper: write a CSV file into the zip.
				writeCSV := func(fileName string, headers []string, rows [][]string) error {
					fileWriter, err := zipWriter.Create(fileName)
					if err != nil {
						return err
					}
					csvWriter := csv.NewWriter(fileWriter)
					if err := csvWriter.Write(headers); err != nil {
						return err
					}
					for _, row := range rows {
						if err := csvWriter.Write(row); err != nil {
							return err
						}
					}
					csvWriter.Flush()
					return csvWriter.Error()
				}

				if err := writeCSV(idFileName, idHeaders, rows); err != nil {
					return err
				}
				if err := writeCSV(humanFileName, humanHeaders, rows); err != nil {
					return err
				}
			}

			lookupFileName := "question_lookup.csv"
			fileWriter, err := zipWriter.Create(lookupFileName)
			if err != nil {
				return err
			}
			csvWriter := csv.NewWriter(fileWriter)
			// Write header row.
			if err := csvWriter.Write([]string{"question_id", "question_name"}); err != nil {
				return err
			}
			// Sort keys for a consistent order.
			var questionIDs []string
			for id := range questionInfoMap {
				questionIDs = append(questionIDs, id)
			}
			sort.Strings(questionIDs)
			for _, id := range questionIDs {
				row := []string{id, questionInfoMap[id].Name}
				if err := csvWriter.Write(row); err != nil {
					return err
				}
			}
			csvWriter.Flush()
			if err := csvWriter.Error(); err != nil {
				return err
			}

			if err := zipWriter.Close(); err != nil {
				return err
			}
			e.Response.Header().Set("Content-Type", "application/zip")
			e.Response.Header().Set("Content-Disposition", "attachment; filename=data_export.zip")
			e.Response.WriteHeader(200)
			_, err = e.Response.Write(buf.Bytes())
			return err
		})

		se.Router.POST("/otp-create", func(e *core.RequestEvent) error {
			data := struct {
				PhoneNumber string `json:"phoneNumber"`
			}{}

			if err := e.BindBody(&data); err != nil {
				log.Println("bind error", err)
				return badRequestErr
			}

			user, err := app.FindFirstRecordByData("users", "phoneNumber", data.PhoneNumber)
			if err != nil {
				return notFoundErr
			}

			record, err := createOtp(app, user)

			if err != nil {
				return badRequestErr
			}

			sendText(data.PhoneNumber, "Din engångskod är: "+record.GetString("password"))

			return e.JSON(200, record)
		})

		se.Router.POST("/otp-verify", func(e *core.RequestEvent) error {
			println("/POST otp-verify")
			data := struct {
				VerifyToken string `json:"verifyToken"`
				OTP         string `json:"otp"`
			}{}

			if err := e.BindBody(&data); err != nil {
				log.Println("bind error", err)
				return unauthorizedErr
			}

			record, err := app.FindRecordById("otp", data.VerifyToken)
			if err != nil {
				return unauthorizedErr
			}

			if record.GetDateTime("expiration").Time().Before(time.Now()) {
				app.Delete(record)
				return unauthorizedErr
			}

			if !security.Equal(record.GetString("password"), data.OTP) {
				attempts := record.GetInt("attempts") + 1
				if attempts > 3 {
					app.Delete(record)
					return unauthorizedErr
				}

				record.Set("attempts", attempts)
				if err := app.Save(record); err != nil {
					log.Println("save error", err)
				}

				return unauthorizedErr
			}

			if err := app.ExpandRecord(record, []string{"user"}, nil); len(err) > 0 {
				log.Println("expand error", err)
				return unauthorizedErr
			}

			user := record.ExpandedOne("user")
			if user == nil {
				return unauthorizedErr
			}

			defer app.Delete(record)
			return apis.RecordAuthResponse(e, user, "user", nil)
		})

		se.Router.GET("/daily-schedule", func(e *core.RequestEvent) error {
			info, err := e.RequestInfo()

			authRecord := info.Auth

			if authRecord == nil {
				return unauthorizedErr
			}

			user, err := app.FindRecordById("users", authRecord.Id)
			if err != nil {
				return notFoundErr
			}

			startDate := startDateForDailyQuestionnaires(user)
			endDate := endDateForDailyQuestionnaires(user)

			response := map[string]interface{}{}
			if startDate != nil {
				response["startDate"] = startDate.Format("2006-01-02")
			} else {
				response["startDate"] = nil
			}
			if endDate != nil {
				response["endDate"] = endDate.Format("2006-01-02")
			} else {
				response["endDate"] = nil
			}
			return e.JSON(200, response)
		})

		scheduler.MustAdd("notifications", "0 18 * * *", func() {
			users, err := app.FindRecordsByFilter("users", "phoneNumber != ''", "", 0, 0, nil)
			if err != nil {
				log.Println("error", err)
			}

			questionnaire, _ := app.FindFirstRecordByFilter("questionnaires", "occurrence = 'daily'")

			for _, user := range users {
				if userShouldBeNotified(user) {
					checkAndSendNotification(app, user, questionnaire)
				}
			}
		})

		scheduler.MustAdd("treatment-end-reminders", "0 17 * * *", func() {
			users, err := app.FindRecordsByFilter("users", "phoneNumber != ''", "", 0, 0, nil)
			if err != nil {
				log.Println("error", err)
			}

			for _, user := range users {
				if userShouldBeRemindedAboutTreatmentEnd(user) {
					sendTreatmentEndReminder(app, user)
				}
			}
		})

		scheduler.Start()

		return se.Next()
	})

	app.OnRecordCreate("users").BindFunc(func(e *core.RecordEvent) error {
		diagnosis := e.Record.GetString("diagnosis")

		if diagnosis == "cervix" {
			e.Record.Set("type", "POST")
		} else {
			previousUser, err := getLastCreatedUserWithDiagnosis(app, diagnosis)

			if err != nil {
				return err
			}

			if previousUser != nil {
				if previousUser.GetString("type") == "POST" {
					e.Record.Set("type", "PRE")
				} else {
					e.Record.Set("type", "POST")
				}
			} else {
				e.Record.Set("type", "PRE")
			}
		}

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess("users").BindFunc(func(e *core.RecordEvent) error {
		phoneNumber := e.Record.GetString("phoneNumber")

		otp, err := createOtpWithExpiration(app, e.Record, true)

		if err != nil {
			return badRequestErr
		}

		link := WEB_URL + "/login/" + otp.Id + "?code=" + otp.GetString("password")

		sendText(phoneNumber, "Välkommen till Sahlgrenska forskningsprojekt PreRT. registrera dig här: "+link)

		return nil
	})

	app.OnRecordAfterCreateSuccess("answers").BindFunc(func(e *core.RecordEvent) error {
		questionnaireId := e.Record.GetString("questionnaire")

		if questionnaireId != TREATMENT_END_FORM_ID {
			return nil
		}

		userId := e.Record.GetString("user")

		user, err := app.FindRecordById("users", userId)

		if err != nil {
			return notFoundErr
		}

		answersString := e.Record.GetString("answers")
		// parse json string to map
		var answers map[string]interface{}
		if err := json.Unmarshal([]byte(answersString), &answers); err != nil {
			return badRequestErr
		}

		treatmentEnd := answers[TREATMENT_END_QUESTION_ID]
		user.Set("treatmentEnd", treatmentEnd)
		if err := app.Save(user); err != nil {
			return badRequestErr
		}

		return nil
	})

	app.OnRecordAfterCreateSuccess("exports").BindFunc(func(e *core.RecordEvent) error {
		e.Record.Set("link", fmt.Sprintf("%s/data-export/%s", API_URL, e.Record.Id))

		// save
		if err := e.App.Save(e.Record); err != nil {
			log.Println("export saved")
		}

		return e.Next()
	})

	log.Println("isDevEnv", isDevEnv())

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}

}
