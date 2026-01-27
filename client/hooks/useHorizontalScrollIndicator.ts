import { useRef, useState } from "react";
import { ScrollView } from "react-native";

export function useHorizontalScrollIndicator() {
  const scrollRef = useRef<ScrollView>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const onScroll = (e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;

    setShowLeft(contentOffset.x > 10);
    setShowRight(
      contentOffset.x + layoutMeasurement.width <
        contentSize.width - 10
    );
  };

  const scrollBy = (x: number) => {
    scrollRef.current?.scrollTo({
      x,
      animated: true,
    });
  };

  return {
    scrollRef,
    showLeft,
    showRight,
    onScroll,
    scrollBy,
  };
}
