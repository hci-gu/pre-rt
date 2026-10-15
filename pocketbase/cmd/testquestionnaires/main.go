// This explicit test-only command never starts the server, scheduler or SMS.
package main

import (
	"flag"
	"fmt"
	"github.com/pocketbase/pocketbase/core"
	"myapp/internal/testquestionnaires"
	"os"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
func run() error {
	dir := flag.String("dir", "", "Explicit disposable test database directory")
	snapshot := flag.String("snapshot", "", "Reviewed questionnaire-only JSON")
	prepare := flag.Bool("prepare-resources", false, "Prepare graph before resources; strict import must follow before serving")
	followup := flag.String("followup-questionnaire", "", "Configure this imported one-time form for three-month reminders")
	flag.Parse()
	if os.Getenv("APP_ENV") != "test" || *dir == "" || *snapshot == "" {
		return fmt.Errorf("requires APP_ENV=test, --dir and --snapshot; never use for production")
	}
	raw, err := os.ReadFile(*snapshot)
	if err != nil {
		return err
	}
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: *dir})
	if err = app.Bootstrap(); err != nil {
		return err
	}
	defer app.ResetBootstrapState()
	importDefinitions := testquestionnaires.Apply
	if *prepare {
		importDefinitions = testquestionnaires.Prepare
	}
	if *prepare && *followup != "" {
		return fmt.Errorf("follow-up configuration requires a strict import")
	}
	var changed int
	if *followup != "" {
		changed, err = testquestionnaires.ApplyFollowup(app, raw, *followup)
	} else {
		changed, err = importDefinitions(app, raw)
	}
	if err != nil {
		return err
	}
	fmt.Printf("Questionnaire definitions changed: %d; users, answers and resources untouched\n", changed)
	if *followup != "" {
		fmt.Printf("Three-month follow-up configured: %s\n", *followup)
	}
	return nil
}
