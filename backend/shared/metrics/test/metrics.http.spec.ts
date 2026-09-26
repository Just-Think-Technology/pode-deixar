// Metrics HTTP spec — vertical slice: prefix exclusion, guard, observation

import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MetricsModule } from '../src/metrics.module';

const TOKEN = 'http-slice-token';

@Controller('ping')
class PingController {
  @Get()
  ping(): string {
    return 'pong';
  }

  @Get(':id')
  pingOne(): string {
    return 'pong';
  }
}

// --- Suite ---

describe('Metrics HTTP slice', () => {
  let app: INestApplication;
  const previousToken = process.env.METRICS_TOKEN;

  beforeAll(async () => {
    process.env.METRICS_TOKEN = TOKEN;
    const moduleRef = await Test.createTestingModule({
      imports: [MetricsModule],
      controllers: [PingController],
    }).compile();
    app = moduleRef.createNestApplication();
    // Same contract as bootstrapService: versioned API, metrics excluded.
    app.setGlobalPrefix('api/v1', { exclude: ['metrics'] });
    await app.init();
  });

  afterAll(async () => {
    process.env.METRICS_TOKEN = previousToken;
    await app.close();
  });

  it('rejects scrapes without the bearer token', async () => {
    await request(app.getHttpServer()).get('/metrics').expect(401);
  });

  it('serves the exposition with the bearer token', async () => {
    const response = await request(app.getHttpServer())
      .get('/metrics')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('http_requests_total');
  });

  it('observes versioned routes with patterns, not raw ids', async () => {
    await request(app.getHttpServer()).get('/api/v1/ping/abc123').expect(200);

    const response = await request(app.getHttpServer())
      .get('/metrics')
      .set('Authorization', `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.text).toContain('route="/api/v1/ping/:id"');
    expect(response.text).not.toContain('abc123');
  });
});
