// The content importer never starts the web server, reminder scheduler or SMS hooks.
package main

import (
	"flag"
	"fmt"
	"github.com/pocketbase/pocketbase/core"
	"myapp/internal/resourceimport"
	_ "myapp/migrations"
	"os"
	"path/filepath"
	"strings"
	"syscall"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
func run() error {
	flags := flag.NewFlagSet("resources", flag.ContinueOnError)
	dir := flags.String("dir", "", "Explicit PocketBase data directory (required)")
	bundle := flags.String("bundle", "../content/resources/generated/bundle.json", "Extracted bundle")
	out := flags.String("out", "resource-plan.json", "Plan/snapshot output")
	planPath := flags.String("plan", "resource-plan.json", "Reviewed plan to apply")
	runID := flags.String("run", "", "Import run ID")
	review := flags.Bool("review", false, "Draft import, isolated review DB only")
	prefer := flags.String("prefer-source", "", "Comma-separated collection/id conflicts explicitly resolved in favor of Word")
	input := flags.String("snapshot", "", "Content-only snapshot to load into an isolated review DB")
	if err := flags.Parse(os.Args[1:]); err != nil {
		return err
	}
	if *dir == "" || flags.NArg() != 1 {
		return fmt.Errorf("usage: resources --dir <path> [flags] init-review|migrate|snapshot|load-review|plan|apply|verify|rollback")
	}
	command := flags.Arg(0)
	if command == "init-review" {
		if _, e := os.Stat(filepath.Join(*dir, "data.db")); e == nil {
			return fmt.Errorf("init-review requires a new empty directory")
		}
	}
	if err := os.MkdirAll(*dir, 0700); err != nil {
		return err
	}
	lock, err := os.OpenFile(filepath.Join(*dir, ".resource-import.lock"), os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return err
	}
	defer lock.Close()
	if err = syscall.Flock(int(lock.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		return fmt.Errorf("another resource import is running")
	}
	defer syscall.Flock(int(lock.Fd()), syscall.LOCK_UN)
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: *dir})
	if err = app.Bootstrap(); err != nil {
		return err
	}
	defer app.ResetBootstrapState()
	switch command {
	case "init-review", "migrate":
		if err = app.RunAllMigrations(); err != nil {
			return err
		}
		if command == "init-review" {
			return os.WriteFile(filepath.Join(*dir, ".resource-review"), []byte("isolated resource content review\n"), 0600)
		}
	case "snapshot":
		s, e := resourceimport.ReadSnapshot(app)
		if e != nil {
			return e
		}
		return resourceimport.WriteJSON(*out, s)
	case "load-review":
		if !resourceimport.ReviewTarget(app) {
			return fmt.Errorf("load-review requires isolated init-review database")
		}
		var s resourceimport.Snapshot
		if err = resourceimport.ReadJSON(*input, &s); err != nil {
			return err
		}
		return resourceimport.LoadReview(app, s)
	case "plan":
		p, e := resourceimport.BuildPlan(app, *bundle, *review, strings.FieldsFunc(*prefer, func(r rune) bool { return r == ',' }))
		if e != nil {
			return e
		}
		if e = resourceimport.WriteJSON(*out, p); e != nil {
			return e
		}
		fmt.Printf("Plan: %s; operations: %d; issues: %d; review: %t\n", *out, len(p.Operations), len(p.Issues), p.Review)
	case "apply":
		var p resourceimport.Plan
		if err = resourceimport.ReadJSON(*planPath, &p); err != nil {
			return err
		}
		id, e := resourceimport.Apply(app, &p)
		fmt.Println("Run:", id)
		return e
	case "verify":
		return resourceimport.Verify(app, *runID)
	case "rollback":
		p, e := resourceimport.RollbackPlan(app, *runID)
		if e != nil {
			return e
		}
		return resourceimport.WriteJSON(*out, p)
	default:
		return fmt.Errorf("unknown command %q", command)
	}
	return nil
}
