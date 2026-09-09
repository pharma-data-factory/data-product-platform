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
    test('listCapabilities returns typed paginated response', async () => {
      (fetchApi.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'business-capability:make/oee',
              name: 'OEE Management',
              description: 'Manage equipment performance',
              domain: 'Production',
            },
          ],
          total: 1,
        }),
      });

      const api = createApi();
      const result = await api.listCapabilities();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('business-capability:make/oee');
      expect(result.items[0].name).toBe('OEE Management');
      expect(result.total).toBe(1);
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

    test('updateBusinessCapability URL-encodes slash-containing id', async () => {
      const api = createApi();
      await api.updateBusinessCapability('business-capability:make/oee', {
        name: 'OEE Management',
      });
      expect(fetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/urs-composer/capabilities/business-capability%3Amake%2Foee',
        expect.any(Object),
      );
    });

    test('retireBusinessCapability URL-encodes slash-containing id', async () => {
      const api = createApi();
      await api.retireBusinessCapability('business-capability:make/oee');
      expect(fetchApi.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/urs-composer/capabilities/business-capability%3Amake%2Foee',
        expect.any(Object),
      );
    });
  });

  // ============================================================================
  // SIGNATURE ENDPOINTS
  // ============================================================================

  describe('Signature endpoints', () => {
    test('setSigningPin accepts an empty 204 response', async () => {
      // The route answers 204 with no body. Parsing that as JSON throws, and
      // a PIN is the precondition for every signature, so this has to work.
      (fetchApi.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => {
          throw new SyntaxError('Unexpected end of JSON input');
        },
      });

      const api = createApi();

      await expect(api.setSigningPin('123456')).resolves.toBeUndefined();
      expect(fetchApi.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/signing-pin'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ pin: '123456' }),
        }),
      );
    });

    test('listSignatures unwraps the items the route wraps them in', async () => {
      (fetchApi.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'sig-1',
              targetType: 'REQUIREMENT_VERSION',
              targetId: 'ver-1',
              meaning: 'REVIEWED',
              signedBy: 'user:default/anna',
              signedAt: '2026-01-01T00:00:00.000Z',
              contentHashAtSigning: 'abc',
            },
          ],
        }),
      });

      const api = createApi();
      const result = await api.listSignatures('ver-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].signedBy).toBe('user:default/anna');
    });

    test('listSignatures reports no signatures as an empty list', async () => {
      (fetchApi.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const api = createApi();

      await expect(api.listSignatures('ver-1')).resolves.toEqual([]);
    });
  });
});
