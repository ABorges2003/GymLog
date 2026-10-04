import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

// Height of the on-screen keyboard in pixels (0 when hidden). On Android the
// keyboard is drawn over the app, so screens use this to add room at the bottom.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) =>
      setHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
