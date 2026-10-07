import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

type KeyboardFrame = {
  // Height in pixels (0 when hidden).
  height: number;
  // Screen Y of the keyboard's top edge (null when hidden).
  top: number | null;
};

// The on-screen keyboard's size and position. On Android the keyboard is
// drawn over the app, so screens use this to add room at the bottom.
export function useKeyboardFrame(): KeyboardFrame {
  const [frame, setFrame] = useState<KeyboardFrame>({ height: 0, top: null });

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) =>
      setFrame({
        height: event.endCoordinates.height,
        top: event.endCoordinates.screenY,
      }),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setFrame({ height: 0, top: null }),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return frame;
}

// Height of the on-screen keyboard in pixels (0 when hidden).
export function useKeyboardHeight(): number {
  return useKeyboardFrame().height;
}
