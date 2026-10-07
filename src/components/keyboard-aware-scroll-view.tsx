import { useCallback, useEffect, useRef } from "react";
import {
  ScrollView,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";

import { useKeyboardFrame } from "@/hooks/use-keyboard-height";

// Space kept between the focused input and the keyboard.
const MARGIN = 24;

// ScrollView for forms: while the keyboard is open it adds room at the bottom
// and scrolls the focused input above the keyboard, also when moving from one
// input to another.
export function KeyboardAwareScrollView({
  contentContainerStyle,
  onScroll,
  children,
  ...props
}: ScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const { height, top } = useKeyboardFrame();

  const revealFocusedInput = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    if (!input || top === null) return;
    input.measureInWindow((_x, y, _width, inputHeight) => {
      const overlap = y + inputHeight + MARGIN - top;
      if (overlap > 0) {
        scrollRef.current?.scrollTo({
          y: scrollY.current + overlap,
          animated: true,
        });
      }
    });
  }, [top]);

  // When the keyboard opens (or changes size).
  useEffect(() => {
    if (height > 0) revealFocusedInput();
  }, [height, revealFocusedInput]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      {...props}
      contentContainerStyle={[
        contentContainerStyle,
        height > 0 && { paddingBottom: height + MARGIN },
      ]}
      scrollEventThrottle={16}
      onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      }}
      // Tapping another input while the keyboard is open: wait for the focus
      // to move, then reveal it.
      onTouchEnd={() => {
        if (height > 0) setTimeout(revealFocusedInput, 150);
      }}
    >
      {children}
    </ScrollView>
  );
}
