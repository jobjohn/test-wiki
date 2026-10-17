// Storybook 用: サーバーアクション（src/actions/*）の代わり。何もせず、フォームの空の結果を返す。
import type { FormState } from "@/lib/form";

const noop = async (): Promise<FormState> => ({});
const noopAction = async (): Promise<void> => {};

export const updateProfileAction = noop;
export const changePasswordAction = noop;
export const enableMfaAction = noop;
export const regenerateBackupCodesAction = noop;
export const disableMfaAction = noop;
export const loginAction = noop;
export const mfaChallengeAction = noop;
export const logoutAction = noopAction;
export const saveFolderAction = noop;
export const deleteFolderAction = noopAction;
export const savePageAction = noop;
export const deletePageAction = noopAction;
export const restoreRevisionAction = noopAction;
export const saveSettingsAction = noop;
export const completeSetupAction = noop;
export const deleteUploadAction = noopAction;
export const saveUserAction = noop;
export const deleteUserAction = noopAction;
export const resetUserMfaAction = noopAction;
export const saveBookmarkAction = noop;
export const deleteBookmarkAction = noopAction;
/** URL の情報の取得。example.com 以外は取得に失敗した扱いにする */
export const fetchUrlMetadataAction = async (url: string) =>
  /^https?:\/\/(www\.)?example\.com/.test(url) ? { title: "Example Domain" } : { error: "タイトルを取得できませんでした。手動で入力してください。" };
export const createApiTokenAction = noop;
export const revokeApiTokenAction = noopAction;
export const restoreTrashAction = noopAction;
export const purgeTrashItemAction = noopAction;
export const emptyTrashAction = noopAction;
