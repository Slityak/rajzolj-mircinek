# Everything runs inside Docker; nothing but Docker is needed on the host.
# Cloudflare token + account id: ./.env if present, else ~/tools/.env. Override: make dev CF_ENV=/other/.env
CF_ENV ?= $(if $(wildcard .env),.env,$(HOME)/tools/.env)
CF = set -a; if [ -r $(CF_ENV) ]; then . $(CF_ENV); else echo "warning: $(CF_ENV) not found (copy .env.example to .env), Jev calls will fail" >&2; fi; set +a;
RUN = @$(CF) docker compose run --rm app

eval:       ## Judge accuracy on synthetic doodles (needs `make dev` running)
	docker compose exec app npx tsx scripts/eval.mts

describe:   ## Print the verbal description Jev gets for each eval doodle
	docker compose exec app npx tsx scripts/describe-shapes.mts

.PHONY: eval describe dev build typecheck deploy types icons shell install clean

dev:        ## Vite + Worker (with real Jev) on http://localhost:5173
	@$(CF) docker compose up --build

build:      ## Typecheck + production build into dist/
	$(RUN) npm run build

typecheck:
	$(RUN) npm run typecheck

deploy:     ## Build and deploy to Cloudflare Workers
	$(RUN) npm run deploy

types:      ## Regenerate worker/worker-configuration.d.ts from wrangler.jsonc
	$(RUN) npm run cf-typegen

icons:      ## Regenerate PWA PNG icons from public/icons/icon.svg
	$(RUN) npm run icons

shell:      ## Shell inside the toolchain container (e.g. `npm i -D foo`)
	$(RUN) bash

install:    ## Rebuild the image after dependency changes
	docker compose build

clean:
	docker compose down -v
