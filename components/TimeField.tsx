import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { colors } from "@/constants/theme";
import { minutesToTimeText, timeTextToMinutes } from "@/lib/time";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  defaultValue?: string;
};

const isValidTime = (value: string) => /^\d{1,2}:\d{2}$/.test(value);

const dateFromTime = (value: string) => {
  const minutes = timeTextToMinutes(isValidTime(value) ? value : "09:00");
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
};

const timeFromDate = (date: Date) => minutesToTimeText(date.getHours() * 60 + date.getMinutes());

export function TimeField({
  label,
  value,
  onChange,
  allowEmpty = false,
  emptyLabel = "진행 중",
  defaultValue = "09:00",
}: Props) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => dateFromTime(value || defaultValue));
  const displayValue = value || emptyLabel;

  const openPicker = () => {
    const nextValue = value || defaultValue;
    setDraftDate(dateFromTime(nextValue));
    setOpen(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setOpen(false);
    if (event.type === "set" && selectedDate) onChange(timeFromDate(selectedDate));
  };

  const handleIosChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) setDraftDate(selectedDate);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {allowEmpty ? (
        <View style={styles.segmentRow}>
          <Pressable onPress={() => onChange("")} style={[styles.segment, !value && styles.segmentActive]}>
            <Text style={[styles.segmentText, !value && styles.segmentTextActive]}>{emptyLabel}</Text>
          </Pressable>
          <Pressable onPress={openPicker} style={[styles.segment, !!value && styles.segmentActive]}>
            <Text style={[styles.segmentText, !!value && styles.segmentTextActive]}>시간 지정</Text>
          </Pressable>
        </View>
      ) : null}
      {allowEmpty && !value ? null : (
        <Pressable onPress={openPicker} style={styles.field}>
          <Text style={styles.timeText}>{displayValue}</Text>
        </Pressable>
      )}

      {open && Platform.OS === "android" ? (
        <DateTimePicker value={draftDate} mode="time" display="default" is24Hour={false} onChange={handleAndroidChange} />
      ) : null}

      {Platform.OS !== "android" ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <View style={styles.card}>
              <Text style={styles.modalTitle}>{label}</Text>
              <DateTimePicker value={draftDate} mode="time" display="spinner" is24Hour={false} onChange={handleIosChange} />
              <View style={styles.actions}>
                <Pressable onPress={() => setOpen(false)} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>취소</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChange(timeFromDate(draftDate));
                    setOpen(false);
                  }}
                  style={styles.confirmButton}
                >
                  <Text style={styles.confirmText}>확인</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    gap: 6,
    minWidth: 0,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 6,
  },
  segment: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 10,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  segmentTextActive: {
    color: "#fff",
  },
  field: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  timeText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.42)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    gap: 14,
    padding: 16,
    width: "100%",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  cancelText: {
    color: colors.text,
    fontWeight: "800",
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  confirmText: {
    color: "#fff",
    fontWeight: "900",
  },
});
