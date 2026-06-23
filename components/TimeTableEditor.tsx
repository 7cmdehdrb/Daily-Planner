import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

export type EditableTimeBlock = {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  startMinute: number;
  endMinute: number;
  memo?: string | null;
};

type Props = {
  blocks: EditableTimeBlock[];
  dayStartMinute?: number;
  snapMinutes?: number;
  onCreateAt: (minute: number) => void;
  onBlockPress: (blockId: string) => void;
  onBlockLongPress: (blockId: string) => void;
  onBlockChange: (blockId: string, startMinute: number, endMinute: number) => void;
  onBlockDelete: (blockId: string) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
};

const minuteHeight = 1.15;
const dayMinutes = 24 * 60;
const minBlockMinutes = 10;
const blockGapPx = 4;

const categoryColors: Record<string, string> = {
  job: "#2563eb",
  study: "#7c3aed",
  exercise: "#059669",
  hobby: "#db2777",
  rest: "#0891b2",
  sleep: "#475569",
  meal: "#d97706",
  transit: "#4f46e5",
  chores: "#0f766e",
  other: "#64748b",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const snap = (value: number, step: number) => Math.round(value / step) * step;

const formatMinute = (minute: number, dayStartMinute: number) => {
  const total = (dayStartMinute + minute) % dayMinutes;
  const hour = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export function TimeTableEditor({
  blocks,
  dayStartMinute = 5 * 60,
  snapMinutes = 10,
  onCreateAt,
  onBlockPress,
  onBlockLongPress,
  onBlockChange,
  onBlockDelete,
  onGestureStart,
  onGestureEnd,
}: Props) {
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.startMinute - b.startMinute), [blocks]);

  const createAtY = (y: number) => {
    const minute = clamp(snap(Math.round(y / minuteHeight), snapMinutes), 0, dayMinutes - snapMinutes);
    onCreateAt(minute);
  };

  return (
    <View style={styles.shell}>
      <Pressable onPress={(event) => createAtY(event.nativeEvent.locationY)} style={[styles.timeline, { height: dayMinutes * minuteHeight }]}>
        {Array.from({ length: 25 }).map((_, index) => {
          const minute = index * 60;
          return (
            <View key={minute} pointerEvents="none" style={[styles.hourLine, { top: minute * minuteHeight }]}>
              <Text style={styles.hourText}>{formatMinute(minute, dayStartMinute)}</Text>
              <View style={styles.line} />
            </View>
          );
        })}
        {sortedBlocks.map((block) => (
          <TimeBlock
            key={block.id}
            block={block}
            dayStartMinute={dayStartMinute}
            snapMinutes={snapMinutes}
            onPress={() => onBlockPress(block.id)}
            onLongPress={() => onBlockLongPress(block.id)}
            onDelete={() => onBlockDelete(block.id)}
            onGestureStart={onGestureStart}
            onGestureEnd={onGestureEnd}
            onPreview={(start, end) => setDragLabel(`${formatMinute(start, dayStartMinute)}-${formatMinute(end, dayStartMinute)}`)}
            onChange={(start, end) => {
              setDragLabel(null);
              onBlockChange(block.id, start, end);
            }}
            onCancel={() => setDragLabel(null)}
          />
        ))}
      </Pressable>
      {dragLabel ? (
        <View style={styles.dragBubble} pointerEvents="none">
          <Text style={styles.dragText}>{dragLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

type BlockProps = {
  block: EditableTimeBlock;
  dayStartMinute: number;
  snapMinutes: number;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
  onPreview: (startMinute: number, endMinute: number) => void;
  onChange: (startMinute: number, endMinute: number) => void;
  onCancel: () => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
};

function TimeBlock({
  block,
  dayStartMinute,
  snapMinutes,
  onPress,
  onLongPress,
  onDelete,
  onPreview,
  onChange,
  onCancel,
  onGestureStart,
  onGestureEnd,
}: BlockProps) {
  const startRef = useRef(block.startMinute);
  const endRef = useRef(block.endMinute);

  startRef.current = block.startMinute;
  endRef.current = block.endMinute;

  const moveResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: onGestureStart,
        onPanResponderMove: (_, gesture) => {
          const delta = snap(Math.round(gesture.dy / minuteHeight), snapMinutes);
          const duration = endRef.current - startRef.current;
          const nextStart = clamp(startRef.current + delta, 0, dayMinutes - duration);
          onPreview(nextStart, nextStart + duration);
        },
        onPanResponderRelease: (_, gesture) => {
          const delta = snap(Math.round(gesture.dy / minuteHeight), snapMinutes);
          const duration = endRef.current - startRef.current;
          const nextStart = clamp(startRef.current + delta, 0, dayMinutes - duration);
          onChange(nextStart, nextStart + duration);
          onGestureEnd?.();
        },
        onPanResponderTerminate: () => {
          onCancel();
          onGestureEnd?.();
        },
        onShouldBlockNativeResponder: () => true,
      }),
    [onCancel, onChange, onGestureEnd, onGestureStart, onPreview, snapMinutes],
  );

  const topHandleResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: onGestureStart,
        onPanResponderMove: (_, gesture) => {
          const delta = snap(Math.round(gesture.dy / minuteHeight), snapMinutes);
          const nextStart = clamp(startRef.current + delta, 0, endRef.current - minBlockMinutes);
          onPreview(nextStart, endRef.current);
        },
        onPanResponderRelease: (_, gesture) => {
          const delta = snap(Math.round(gesture.dy / minuteHeight), snapMinutes);
          const nextStart = clamp(startRef.current + delta, 0, endRef.current - minBlockMinutes);
          onChange(nextStart, endRef.current);
          onGestureEnd?.();
        },
        onPanResponderTerminate: () => {
          onCancel();
          onGestureEnd?.();
        },
        onShouldBlockNativeResponder: () => true,
      }),
    [onCancel, onChange, onGestureEnd, onGestureStart, onPreview, snapMinutes],
  );

  const bottomHandleResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: onGestureStart,
        onPanResponderMove: (_, gesture) => {
          const delta = snap(Math.round(gesture.dy / minuteHeight), snapMinutes);
          const nextEnd = clamp(endRef.current + delta, startRef.current + minBlockMinutes, dayMinutes);
          onPreview(startRef.current, nextEnd);
        },
        onPanResponderRelease: (_, gesture) => {
          const delta = snap(Math.round(gesture.dy / minuteHeight), snapMinutes);
          const nextEnd = clamp(endRef.current + delta, startRef.current + minBlockMinutes, dayMinutes);
          onChange(startRef.current, nextEnd);
          onGestureEnd?.();
        },
        onPanResponderTerminate: () => {
          onCancel();
          onGestureEnd?.();
        },
        onShouldBlockNativeResponder: () => true,
      }),
    [onCancel, onChange, onGestureEnd, onGestureStart, onPreview, snapMinutes],
  );

  const rawTop = block.startMinute * minuteHeight;
  const rawHeight = (block.endMinute - block.startMinute) * minuteHeight;
  const top = rawTop + blockGapPx / 2;
  const height = Math.max(34, rawHeight - blockGapPx);
  const blockColor = categoryColors[block.categoryId] ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={1000}
      style={[styles.block, { top, height, backgroundColor: blockColor }]}
      {...moveResponder.panHandlers}
    >
      <View style={styles.handleTouchTop} {...topHandleResponder.panHandlers}>
        <View style={styles.handle} />
      </View>
      <View style={styles.blockHeader}>
        <View style={styles.blockTextWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.blockTitle} numberOfLines={1}>
              {block.title}
            </Text>
            <Text style={styles.categoryPill} numberOfLines={1}>
              {block.categoryName}
            </Text>
          </View>
        </View>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteButton}>
          <Ionicons name="trash-outline" color="#fff" size={16} />
        </Pressable>
      </View>
      {height >= 58 && block.memo ? (
        <Text style={styles.memo} numberOfLines={1}>
          {block.memo}
        </Text>
      ) : null}
      <View style={styles.handleTouchBottom} {...bottomHandleResponder.panHandlers}>
        <View style={styles.handle} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "relative",
  },
  timeline: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  hourLine: {
    alignItems: "center",
    flexDirection: "row",
    left: 0,
    position: "absolute",
    right: 0,
  },
  hourText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    paddingLeft: 8,
    width: 54,
  },
  line: {
    backgroundColor: colors.line,
    flex: 1,
    height: 1,
  },
  block: {
    borderRadius: 8,
    justifyContent: "center",
    left: 58,
    paddingHorizontal: 9,
    position: "absolute",
    right: 10,
  },
  handleTouchTop: {
    alignItems: "center",
    height: 14,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  handleTouchBottom: {
    alignItems: "center",
    bottom: 0,
    height: 14,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 2,
  },
  handle: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    height: 4,
    width: 42,
  },
  blockHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  blockTextWrap: {
    flex: 1,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  blockTitle: {
    color: "#fff",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  categoryPill: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  memo: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 12,
  },
  deleteButton: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  dragBubble: {
    alignSelf: "center",
    backgroundColor: colors.text,
    borderRadius: 8,
    bottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
  },
  dragText: {
    color: "#fff",
    fontWeight: "800",
  },
});
