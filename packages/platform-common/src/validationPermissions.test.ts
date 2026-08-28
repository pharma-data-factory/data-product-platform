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

  it('allows platform admin to administer plugin but never auto-approve', () => {
    expect(decidePermission(validationAdminPermission, 'PLATFORM_ADMIN')).toBe(
      'allow',
    );
    expect(canAdministerValidation('PLATFORM_ADMIN')).toBe(true);
    expect(decidePermission(validationApprovePermission, 'PLATFORM_ADMIN')).toBe(
      'deny',
    );
    expect(decidePermission(riskAcceptPermission, 'PLATFORM_ADMIN')).toBe('deny');
    expect(decidePermission(baselineModifyPermission, 'PLATFORM_ADMIN')).toBe('deny');
  });
});
