// Package sms sends messages without treating HTTP error responses as delivery.
package sms

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// ErrUncertain means the provider may have accepted the message. Automatically
// retrying these requests could send duplicates; reconcile them with the provider.
var ErrUncertain = errors.New("SMS delivery outcome is uncertain")

type Sender struct {
	Client   *http.Client
	Endpoint string
	Username string
	Password string
}

func (s Sender) Send(phone, message string) error {
	if s.Username == "" || s.Password == "" {
		return errors.New("SMS credentials are not configured")
	}
	if strings.HasPrefix(phone, "0") {
		phone = "+46" + phone[1:]
	}
	endpoint := s.Endpoint
	if endpoint == "" {
		endpoint = "https://api.46elks.com/a1/sms"
	}
	data := url.Values{"from": {"StudiePreRT"}, "to": {phone}, "message": {message}}
	req, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return err
	}
	req.SetBasicAuth(s.Username, s.Password)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client := s.Client
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	response, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrUncertain, err)
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
	if response.StatusCode >= 200 && response.StatusCode < 300 {
		return nil
	}
	if response.StatusCode >= 500 || response.StatusCode == http.StatusRequestTimeout {
		return fmt.Errorf("%w: HTTP %d", ErrUncertain, response.StatusCode)
	}
	return fmt.Errorf("SMS rejected: HTTP %d", response.StatusCode)
}
