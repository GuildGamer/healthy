import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import { adminContract, appContract } from '@product/contract';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../openapi/openapi.json');

type OpenApiDoc = {
  paths?: Record<string, unknown>;
  components?: { schemas?: Record<string, unknown> };
};

async function main(): Promise<void> {
  const generator = new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  });

  const member = (await generator.generate(appContract, {
    info: {
      title: 'Product API',
      version: '0.0.1',
    },
  })) as OpenApiDoc;

  const admin = (await generator.generate(adminContract, {
    info: {
      title: 'Product API',
      version: '0.0.1',
    },
  })) as OpenApiDoc;

  const spec = {
    ...member,
    paths: {
      ...member.paths,
      ...admin.paths,
    },
    components: {
      ...member.components,
      schemas: {
        ...member.components?.schemas,
        ...admin.components?.schemas,
      },
    },
  };

  const serialized = `${JSON.stringify(spec, null, 2)}\n`;
  const check = process.argv.includes('--check');

  if (check) {
    const existing = readFileSync(outputPath, 'utf8');
    if (existing !== serialized) {
      console.error('openapi.json is out of date. Run: pnpm openapi:generate');
      process.exit(1);
    }
    console.log('openapi.json is up to date');
    return;
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serialized);
  console.log(`Wrote ${outputPath}`);
}

void main();
