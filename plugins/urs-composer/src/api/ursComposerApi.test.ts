/**
 * URS Composer API Client Tests
 * 
 * Tests for:
 * - API request/response mapping
 * - Error handling
 * - Error code mapping
 */

import { URSComposerApi, URSApiError } from './ursComposerApi';

const discoveryApi = {
  getBaseUrl: jest
    .fn()
    .mockResolvedValue('http://localhost:7007/api/urs-composer'),
};
const fetchApi = {
  fetch: jest.fn(),
};

function createApi(): URSComposerApi {
  return new URSComposerApi({ discoveryApi, fetchApi });
}

describe('URSComposerApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // SUCCESS CASES
  // ============================================================================

  describe('Success mapping', () => {
    test('listCapabilities returns typed array', async () => {
      (fetchApi.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'business-capability:make/oee',
            name: 'OEE Management',
            description: 'Manage equipment performance',
            domain: 'Production',
          },
        ],
      });

      const api = createApi();
      const result = await api.listCapabilities();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('business-capability:make/oee');
      expect(result[0].name).toBe('OEE Management');
    });

    test('createRequirementSet returns typed response', async () => {
      (fetchApi.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'uuid-123',
          requirementSetId: 'URS-OEE',
          versionNumber: 1,
          businessCapabilityRefs: ['business-capability:make/oee'],
          businessNeed: 'Equipment visibility',
          solutionType: 'PROJECT',
          solutionName: 'OEE Dashboard',
          status: 'DRAFT',
          createdBy: 'user:default/test',
          createdAt: '2026-08-26T00:00:00Z',
        }),
      });

      const api = createApi();
      const result = await api.createRequirementSet({
        businessCapabilityRefs: ['business-capability:make/oee'],
        businessNeed: 'Equipment visibility',
        solutionType: 'PROJECT' as any,
        solutionName: 'OEE Dashboard',
      });

      expect(result.id).toBe('uuid-123');
      expect(result.requirementSetId).toBe('URS-OEE');
      expect(result.status).toBe('DRAFT');
    });
  });

  // ============================================================================
  // ERROR CASES
  // ============================================================================

  describe('Error mapping', () => {
    test('HTTP 400 throws URSApiError', async () => {
      (fetchApi.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Missing required field: businessNeed',
        }),
      });

      const api = createApi();

      try {
        await api.createRequirementSet({
          businessCapabilityRefs: [],
          businessNeed: '',
          solutionType: 'PROJECT' as any,
          solutionName: '',
        });
        fail('Should have thrown');
      } catch (err) {
        const error = err as URSApiError;
        expect(error.status).toBe(400);
        expect(error.message).toContain('Missing required field');
      }
    });

    test('HTTP 401 throws URSApiError', async () => {
      (fetchApi.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
        }),
      });

      const api = createApi();

      try {
        await api.listCapabilities();
        fail('Should have thrown');
      } catch (err) {
        const error = err as URSApiError;
        expect(error.status).toBe(401);
      }
    });

    test('HTTP 403 throws URSApiError', async () => {
      (fetchApi.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Forbidden',
        }),
      });

      const api = createApi();

      try {
        await api.createRequirementSet({
          businessCapabilityRefs: [],
          businessNeed: '',
          solutionType: 'PROJECT' as any,
          solutionName: '',
        });
        fail('Should have thrown');
      } catch (err) {
        const error = err as URSApiError;
        expect(error.status).toBe(403);
      }
    });

    test('HTTP 404 throws URSApiError', async () => {
      (fetchApi.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Requirement set not found',
        }),
      });

      const api = createApi();

      try {
        await api.getRequirementSet('nonexistent');
        fail('Should have thrown');
      } catch (err) {
        const error = err as URSApiError;
        expect(error.status).toBe(404);
      }
    });

    test('HTTP 500 throws URSApiError', async () => {
      (fetchApi.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error',
        }),
      });

      const api = createApi();

      try {
        await api.health();
        fail('Should have thrown');
      } catch (err) {
        const error = err as URSApiError;
        expect(error.status).toBe(500);
      }
    });
  });

  // ============================================================================
  // ENDPOINT TESTS
  // ============================================================================

  describe('All endpoints callable', () => {
    beforeEach(() => {
      (fetchApi.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
    });

    test('health endpoint', async () => {
      const api = createApi();
      await api.health();
      expect(fetchApi.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.any(Object),
      );
    });

    test('listCapabilities endpoint', async () => {
      const api = createApi();
      await api.listCapabilities();
      expect(fetchApi.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/capabilities'),
        expect.any(Object),
      );
    });

    test('listRequirementSets endpoint', async () => {
      const api = createApi();
      await api.listRequirementSets();
      expect(fetchApi.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/requirement-sets'),
        expect.any(Object),
      );
    });

    test('submitBaseline endpoint', async () => {
      const api = createApi();
      await api.submitBaseline('baseline-123');
      expect(fetchApi.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/baselines/baseline-123/submit'),
        expect.any(Object),
      );
    });
  });
});
