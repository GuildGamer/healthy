SHELL := /bin/bash

.PHONY: help install up down logs migrate migrate-deploy seed api mobile web build typecheck test openapi openapi-check split-repos

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

web:
	@echo "+ pnpm --filter @product/web dev"
	@pnpm --filter @product/web dev

build:
	@echo "+ pnpm build"
	@pnpm build

typecheck:
	@echo "+ pnpm typecheck"
	@pnpm typecheck

test:
	@echo "+ pnpm test"
	@pnpm test

openapi:
	@echo "+ pnpm openapi:generate"
	@pnpm openapi:generate

openapi-check:
	@echo "+ pnpm openapi:check"
	@pnpm openapi:check

split-repos:
	@echo "+ bash scripts/split-repos.sh"
	@bash scripts/split-repos.sh
