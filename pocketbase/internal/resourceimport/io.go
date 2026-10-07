package resourceimport

import (
	"fmt"
	"io"
)

func readAllLimited(r io.Reader, n int64) ([]byte, error) {
	b, e := io.ReadAll(io.LimitReader(r, n+1))
	if e != nil {
		return nil, e
	}
	if int64(len(b)) > n {
		return nil, fmt.Errorf("file too large")
	}
	return b, nil
}
