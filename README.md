<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## PostgreSQL and Prisma

Prisma is configured for PostgreSQL. Copy `.env.example` to `.env` and set
`DATABASE_URL` to your PostgreSQL connection string before generating the client
or running migrations:

```bash
copy .env.example .env
npm run db:generate
```

When a PostgreSQL database is available, create and apply the first migration
with:

```bash
npm run db:migrate -- --name init
```

The initial schema defines businesses, customers, leads, and enquiries, with
status/source enums and tenant-scoped customer relations. `PrismaModule` and
`PrismaService` are registered through the dashboard feature module.

## Demo database seed

After configuring `DATABASE_URL` and applying the Prisma migrations, seed a
small UrbanNest demo dataset with:

```bash
npm run db:seed
```

The seed uses stable IDs and upserts, so rerunning it updates the same demo
records instead of creating duplicates. It prints the Business ID when it
completes; the stable demo Business ID is `bizpilot-demo-urbannest`.

## Dashboard API

`GET /dashboard?businessId=<business-id>` returns dashboard metrics scoped to a
business, the five most recent enquiries, and lead counts for every lead
status. The endpoint responds with `400` when `businessId` is missing, `404`
when the business does not exist, and `503` when Prisma reports a database
connection failure. Apply the Prisma migrations before using the endpoint with
PostgreSQL.

## Leads API

- `GET /leads?businessId=<business-id>` lists leads and customer details.
  Optional `status`, `source`, and `search` query parameters filter results.
- `POST /leads` creates a lead using `businessId`, `customerId`, and `service`;
  `source`, `status`, and `message` are optional.
- `PATCH /leads/:id` updates editable lead fields. Include `businessId` in the
  JSON body; lead updates are always scoped to that business.

Lead status and source values must match the enums in the Prisma schema.

## Business Profile API

- `GET /businesses/:id` returns the business profile, including `id`, `name`,
  `email`, `phone`, `industry`, `location`, `createdAt`, and `updatedAt`.
- `PATCH /businesses/:id` updates one or more of `name`, `email`, `phone`,
  `industry`, and `location`. Empty optional values for nullable fields can be
  sent as `null` or an empty string; unsupported fields are rejected.
- The endpoint returns `400` for invalid input, `404` when the business does
  not exist, and `503` when the database is unavailable.

For the seeded UrbanNest demo business, use
`bizpilot-demo-urbannest` as the `:id`.

## AI Assistant API

`POST /ai-assistant/chat` accepts `businessId` and a non-empty `message` (up to
2,000 characters). It verifies the business, loads its profile and recent
business-scoped leads/enquiries with status counts, then passes that context
and the question to the configured response provider. The response contains
an `answer` and optional structured `data`. Invalid input returns `400`, an
unknown business returns `404`, and database/provider failures return `503`.

Context retrieval and answer generation are separate services. The injectable
`AiProvider` abstraction supports a rule-based provider and Google's Gemini
provider. Set `AI_PROVIDER=rule-based` to use deterministic local responses
(the default), or set `AI_PROVIDER=gemini` to use Gemini. Gemini requires
`GEMINI_API_KEY`; `GEMINI_MODEL` is optional and defaults to
`gemini-2.5-flash`. Missing Gemini credentials fail clearly during startup;
provider/network failures return `503`. The API key is read only by the backend
and is never sent to Angular or included in logs.

Copy `.env.example` to `.env` and set the values locally. Keep `.env` private
and do not commit credentials. The model is given only the current structured
business context and the user's question; it has no tools or database access
and is instructed not to invent details.

Example request:

```json
{
  "businessId": "bizpilot-demo-urbannest",
  "message": "How many new enquiries?"
}
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observer](https://observer.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
