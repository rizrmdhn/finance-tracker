import { KeyboardAwareScrollView as KeyboardAwareScrollViewImpl } from "react-native-keyboard-controller";
import { withUniwind } from "uniwind";

/**
 * ScrollView that keeps the focused input visible above the keyboard.
 * Use instead of `ScrollView` for any scrollable content containing inputs.
 */
export const KeyboardAwareScrollView = withUniwind(KeyboardAwareScrollViewImpl);
