import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { VerifyService } from '../src/verify/verify.service';
import { VerifyRepository } from '../src/verify/verify.repository';
import { AuthLoggerService } from '../src/shared/auth-logger.service';

const ACCESS_SECRET = 'teste-access-secret-com-32-chars-minimo-0123456789abcdef';

describe('VerifyService', () => {
  let service: VerifyService;

  const mockRepository = {
    findBlacklistedToken: jest.fn(),
    findUserById: jest.fn(),
  };

  const mockJwt = {
    verifyAsync: jest.fn(),
  };

  const mockConfig = {
    getOrThrow: jest.fn(() => ACCESS_SECRET),
  };

  const mockLogger = {
    logTokenVerification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyService,
        { provide: VerifyRepository, useValue: mockRepository },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuthLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<VerifyService>(VerifyService);
    jest.clearAllMocks();
  });

  it('should return unauthorized when no token is provided', async () => {
    const result = await service.verify(null);

    expect(result.authorized).toBe(false);
  });

  it('should return unauthorized for an invalid token', async () => {
    mockJwt.verifyAsync.mockRejectedValue(new Error('invalid'));

    const result = await service.verify('bad-token');

    expect(result.authorized).toBe(false);
  });

  it('should return unauthorized for a non-access token', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ type: 'refresh', sub: 'user-1' });

    const result = await service.verify('refresh-token');

    expect(result.authorized).toBe(false);
  });

  it('should return unauthorized for a revoked token', async () => {
    mockJwt.verifyAsync.mockResolvedValue({
      type: 'access',
      sub: 'user-1',
      jti: 'jti-1',
    });
    mockRepository.findBlacklistedToken.mockResolvedValue({ jti: 'jti-1' });

    const result = await service.verify('revoked-token');

    expect(result.authorized).toBe(false);
  });

  it('should return authorized for a valid token', async () => {
    mockJwt.verifyAsync.mockResolvedValue({
      type: 'access',
      sub: 'user-1',
      email: 'test@example.com',
      role: 'CLIENT',
      jti: 'jti-1',
    });
    mockRepository.findBlacklistedToken.mockResolvedValue(null);
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-1',
      completeName: 'Test User',
      email: 'test@example.com',
      role: 'CLIENT',
    });

    const result: any = await service.verify('valid-token');

    expect(result.authorized).toBe(true);
    expect(result.user.email).toBe('test@example.com');
  });

  it('should return unauthorized when the user no longer exists', async () => {
    mockJwt.verifyAsync.mockResolvedValue({
      type: 'access',
      sub: 'user-1',
      email: 'test@example.com',
      role: 'CLIENT',
    });
    mockRepository.findUserById.mockResolvedValue(null);

    const result = await service.verify('valid-token');

    expect(result.authorized).toBe(false);
  });

  it('should tolerate a missing blacklist table (P2021)', async () => {
    mockJwt.verifyAsync.mockResolvedValue({
      type: 'access',
      sub: 'user-1',
      email: 'test@example.com',
      role: 'CLIENT',
      jti: 'jti-1',
    });
    mockRepository.findBlacklistedToken.mockRejectedValue({ code: 'P2021' });
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-1',
      completeName: 'Test User',
      email: 'test@example.com',
      role: 'CLIENT',
    });

    const result: any = await service.verify('valid-token');

    expect(result.authorized).toBe(true);
  });
});
