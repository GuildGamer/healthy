SHELL := /bin/bash

.PHONY: help install up down logs migrate migrate-deploy seed api mobile ios android web admin e2e-web build typecheck test test-integration openapi openapi-check split-repos lane-b lane-b-stop lane-b-restart lane-b-status lane-b-logs

help:
	@echo "Available targets:"; grep -E '^[a-zA-Z0-9_-]+:' Makefile | cut -d: -f1 | sort

install:
	@echo "+ pnpm install"
	@pnpm install

up:
	@echo "+ docker compose up -d postgres"
	@docker compose up -d postgres

down:
	@echo "+ docker compose down"
	@docker compose down

logs:
	@echo "+ docker compose logs -f --tail=200"
	@docker compose logs -f --tail=200

migrate:
	@echo "+ pnpm --filter @product/db migrate:dev"
	@pnpm --filter @product/db migrate:dev

migrate-deploy:
	@echo "+ pnpm --filter @product/db migrate:deploy"
	@pnpm --filter @product/db migrate:deploy

seed:
	@echo "+ pnpm --filter @product/db seed"
	@pnpm --filter @product/db seed

api:
	@echo "+ pnpm --filter @product/api dev"
	@pnpm --filter @product/api dev

mobile:
	@echo "+ pnpm --filter @product/mobile start"
	@pnpm --filter @product/mobile start

# Lane B (API + Metro + admin) as background jobs. Logs/PIDs under .run/
# Still use `make api` / `make mobile` / `make admin` for foreground single-process work.
lane-b:
	@echo "+ bash scripts/lane-b.sh start"
	@bash scripts/lane-b.sh start

lane-b-stop:
	@echo "+ bash scripts/lane-b.sh stop"
	@bash scripts/lane-b.sh stop

lane-b-restart:
	@echo "+ bash scripts/lane-b.sh restart"
	@bash scripts/lane-b.sh restart

lane-b-status:
	@echo "+ bash scripts/lane-b.sh status"
	@bash scripts/lane-b.sh status

lane-b-logs:
	@echo "+ bash scripts/lane-b.sh logs"
	@bash scripts/lane-b.sh logs

ios:
	@echo "+ pnpm --filter @product/mobile ios"
	@pnpm --filter @product/mobile ios

android:
	@echo "+ pnpm --filter @product/mobile android"
	@pnpm --filter @product/mobile android

web:
	@echo "+ pnpm --filter @product/web dev"
	@pnpm --filter @product/web dev

admin:
	@echo "+ pnpm --filter @product/admin dev"
	@pnpm --filter @product/admin dev

e2e-web:
	@echo "+ pnpm --filter @product/web test:e2e"
	@pnpm --filter @product/web test:e2e

build:
	@echo "+ pnpm build"
	@pnpm build

typecheck:
	@echo "+ pnpm typecheck"
	@pnpm typecheck

test:
	@echo "+ pnpm test"
	@pnpm test

test-integration:
	@echo "+ pnpm --filter @product/api test:integration"
	@pnpm --filter @product/api test:integration

openapi:
	@echo "+ pnpm openapi:generate"
	@pnpm openapi:generate

openapi-check:
	@echo "+ pnpm openapi:check"
	@pnpm openapi:check

split-repos:
	@echo "+ bash scripts/split-repos.sh"
	@bash scripts/split-repos.sh
