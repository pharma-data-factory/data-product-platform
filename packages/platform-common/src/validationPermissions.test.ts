import {
  decidePermission,
  canReadValidation,
  canStartValidationRun,
  canExecuteValidationTest,
  canReviewValidation,
  canAdministerValidation,
} from './policy';
import {
  baselineModifyPermission,
  riskAcceptPermission,
  validationApprovePermission,
  validationReadPermission,
  validationRunStartPermission,
  validationTestExecutePermission,
  validationReviewPermission,
  validationAdminPermission,
} from './permissions';

describe('validation expert permissions', () => {
  it('allows viewers to read validation surfaces', () => {
    expect(decidePermission(validationReadPermission, 'VIEWER')).toBe('allow');
    expect(canReadValidation('VIEWER')).toBe(true);
    expect(decidePermission(validationRunStartPermission, 'VIEWER')).toBe('deny');
    expect(canStartValidationRun('VIEWER')).toBe(false);
  });

  it('allows developers to start runs and execute tests but not accept risks', () => {
    expect(decidePermission(validationRunStartPermission, 'DEVELOPER')).toBe('allow');
    expect(decidePermission(validationTestExecutePermission, 'DEVELOPER')).toBe(
      'allow',
    );
    expect(canExecuteValidationTest('DEVELOPER')).toBe(true);
    expect(decidePermission(riskAcceptPermission, 'DEVELOPER')).toBe('deny');
    expect(decidePermission(validationApprovePermission, 'DEVELOPER')).toBe('deny');
    expect(decidePermission(baselineModifyPermission, 'DEVELOPER')).toBe('deny');
  });

  it('allows owners to review and still denies approval', () => {
    expect(decidePermission(validationReviewPermission, 'DATA_PRODUCT_OWNER')).toBe(
      'allow',
    );
    expect(canReviewValidation('DATA_PRODUCT_OWNER')).toBe(true);
    expect(decidePermission(validationApprovePermission, 'DATA_PRODUCT_OWNER')).toBe(
      'deny',
    );
  });

  it('lets a platform admin administer validation but not approve it (NXD-119)', () => {
    expect(decidePermission(validationAdminPermission, 'PLATFORM_ADMIN')).toBe('allow');
    expect(canAdministerValidation('PLATFORM_ADMIN')).toBe(true);
    // An administrator is neither independent QA nor the validation expert.
    expect(decidePermission(validationApprovePermission, 'PLATFORM_ADMIN')).toBe('deny');
    // risk.accept and baseline.modify remain reserved.
    expect(decidePermission(riskAcceptPermission, 'PLATFORM_ADMIN')).toBe('deny');
    expect(decidePermission(baselineModifyPermission, 'PLATFORM_ADMIN')).toBe('deny');
  });

  it('denies validation.approve to every platform role on its own', () => {
    for (const role of ['VIEWER', 'DEVELOPER', 'DATA_PRODUCT_OWNER', 'BUSINESS_CAPABILITY_LEAD', 'PLATFORM_ADMIN'] as const) {
      expect(decidePermission(validationApprovePermission, role)).toBe('deny');
    }
  });

  it('grants validation.approve through the validation-experts and QA groups only (NXD-119)', () => {
    const decide = (groups: string[], role?: 'VIEWER' | 'PLATFORM_ADMIN') =>
      decidePermission(
        validationApprovePermission,
        role,
        undefined,
        groups.map(g => `group:default/${g}`),
      );
    expect(decide(['platform-viewers', 'validation-experts'], 'VIEWER')).toBe('allow');
    expect(decide(['platform-viewers', 'urs-quality-reviewers'], 'VIEWER')).toBe('allow');
    expect(decide(['platform-admins'], 'PLATFORM_ADMIN')).toBe('deny');
    expect(decide(['urs-authors', 'urs-business-reviewers'], 'VIEWER')).toBe('deny');
  });
});
