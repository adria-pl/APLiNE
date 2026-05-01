import { DocProps, UserProps } from './components';
import { WorkspaceProps } from './components/workspace';

export const TEST_USER: UserProps = {
  email: 'test@test.com',
};

export const TEST_WORKSPACE: WorkspaceProps = {
  name: 'Test Workspace',
  avatar: 'https://raw.githubusercontent.com/adria-pl/APLiNE/canary/assets/APL_Projectes_400.png',
};

export const TEST_DOC: DocProps = {
  title: 'Test Doc',
  url: 'https://app.affine.pro',
};
