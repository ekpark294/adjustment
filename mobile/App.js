import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const DRAFTS_KEY = "hanip-settlement-drafts";
const money = new Intl.NumberFormat("ko-KR");
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const createItem = () => ({ id: makeId(), menu: "", price: "", quantity: 1, members: [] });

function Button({ children, onPress, disabled, variant = "primary", style }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[`${variant}Button`], disabled && styles.disabled, pressed && !disabled && styles.pressed, style]}
    >
      <Text style={[styles.buttonText, styles[`${variant}ButtonText`]]}>{children}</Text>
    </Pressable>
  );
}

function Header({ step, onHome }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onHome} style={styles.brand}>
        <View style={styles.logo}><Text style={styles.logoText}>÷</Text></View>
        <Text style={styles.brandText}>한입정산</Text>
      </Pressable>
      <Text style={styles.stepText}>{step} / 3</Text>
    </View>
  );
}

function Participants({ name, setName, people, setPeople, items, setItems, drafts, onLoad, onDelete, onNext }) {
  const addPerson = () => {
    const value = name.trim();
    if (!value || people.includes(value)) return;
    Haptics.selectionAsync();
    setPeople([...people, value]);
    setName("");
  };
  const removePerson = (person) => {
    setPeople(people.filter((entry) => entry !== person));
    setItems(items.map((item) => ({ ...item, members: item.members.filter((member) => member !== person) })));
  };

  return (
    <View>
      <Text style={styles.eyebrow}>STEP 01</Text>
      <Text style={styles.title}>누구와 함께{`\n`}<Text style={styles.accent}>먹었나요?</Text></Text>
      <Text style={styles.lead}>함께한 사람들의 이름을 추가해주세요.{`\n`}메뉴마다 누가 먹었는지 선택할 수 있어요.</Text>
      <View style={styles.card}>
        <Text style={styles.label}>참여자 이름</Text>
        <View style={styles.inputRow}>
          <TextInput value={name} onChangeText={setName} onSubmitEditing={addPerson} returnKeyType="done" placeholder="이름을 입력하세요" placeholderTextColor="#aaa99f" style={[styles.input, styles.flex]} />
          <Button onPress={addPerson} style={styles.addButton}>＋</Button>
        </View>
        {people.length === 0 && <Text style={styles.empty}>아직 추가된 사람이 없어요.</Text>}
        {people.map((person, index) => (
          <View key={person} style={styles.personRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{index + 1}</Text></View>
            <Text style={styles.personName}>{person}</Text>
            <Pressable onPress={() => removePerson(person)} hitSlop={12}><Text style={styles.deleteText}>삭제</Text></Pressable>
          </View>
        ))}
      </View>
      <Button disabled={people.length < 2} onPress={onNext}>주문 내역 입력하기  →</Button>
      {people.length < 2 && <Text style={styles.hint}>정산하려면 2명 이상 추가해주세요.</Text>}
      {drafts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>임시 저장 내역</Text>
          {drafts.map((draft) => (
            <View style={[styles.card, styles.draft]} key={draft.id}>
              <Pressable style={styles.flex} onPress={() => onLoad(draft)}>
                <Text style={styles.personName}>{draft.people.slice(0, 3).join(", ")}{draft.people.length > 3 ? ` 외 ${draft.people.length - 3}명` : ""}</Text>
                <Text style={styles.meta}>{draft.items.filter((item) => item.menu).length}개 메뉴 · {new Date(draft.updatedAt).toLocaleDateString("ko-KR")}</Text>
              </Pressable>
              <Pressable onPress={() => onDelete(draft.id)}><Text style={styles.deleteText}>삭제</Text></Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Orders({ people, items, setItems, onBack, onSave, saved, onResult }) {
  const update = (id, patch) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const toggleMember = (item, person) => update(item.id, { members: item.members.includes(person) ? item.members.filter((entry) => entry !== person) : [...item.members, person] });

  return (
    <View>
      <Text style={styles.eyebrow}>STEP 02</Text>
      <Text style={styles.title}>무엇을 <Text style={styles.accent}>먹었나요?</Text></Text>
      <Text style={styles.lead}>메뉴와 금액을 적고, 함께 먹은 사람을 선택해주세요.</Text>
      <Button onPress={() => setItems([createItem(), ...items])} variant="secondary">＋ 메뉴 추가</Button>
      {items.map((item, index) => (
        <View style={[styles.card, styles.orderCard]} key={item.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.orderNumber}>{String(items.length - index).padStart(2, "0")}</Text>
            <Text style={[styles.sectionTitle, styles.flex]}>메뉴 정보</Text>
            {items.length > 1 && <Pressable onPress={() => setItems(items.filter((entry) => entry.id !== item.id))}><Text style={styles.deleteText}>삭제</Text></Pressable>}
          </View>
          <Text style={styles.label}>메뉴 이름</Text>
          <TextInput value={item.menu} onChangeText={(menu) => update(item.id, { menu })} placeholder="예: 마라탕" placeholderTextColor="#aaa99f" style={styles.input} />
          <View style={styles.inputRow}>
            <View style={styles.flex}>
              <Text style={styles.label}>가격</Text>
              <TextInput value={String(item.price)} onChangeText={(price) => update(item.id, { price: price.replace(/[^0-9]/g, "") })} keyboardType="number-pad" placeholder="0원" placeholderTextColor="#aaa99f" style={styles.input} />
            </View>
            <View style={styles.quantity}>
              <Text style={styles.label}>수량</Text>
              <TextInput value={String(item.quantity)} onChangeText={(quantity) => update(item.id, { quantity: Math.max(1, Number(quantity) || 1) })} keyboardType="number-pad" style={styles.input} />
            </View>
          </View>
          <View style={styles.memberHeader}>
            <Text style={styles.label}>누가 먹었나요?</Text>
            <Pressable onPress={() => update(item.id, { members: item.members.length === people.length ? [] : [...people] })}>
              <Text style={styles.link}>{item.members.length === people.length ? "전체 해제" : "전체 선택"}</Text>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {people.map((person) => {
              const selected = item.members.includes(person);
              return <Pressable key={person} onPress={() => toggleMember(item, person)} style={[styles.chip, selected && styles.selectedChip]}><Text style={[styles.chipText, selected && styles.selectedChipText]}>{selected ? "✓ " : "+ "}{person}</Text></Pressable>;
            })}
          </View>
        </View>
      ))}
      <View style={styles.actionRow}>
        <Button onPress={onBack} variant="ghost" style={styles.smallButton}>← 이전</Button>
        <Button onPress={onSave} variant="secondary" style={styles.smallButton}>{saved ? "저장 완료" : "임시 저장"}</Button>
      </View>
      <Button disabled={!items.some((item) => item.menu && item.price && item.members.length)} onPress={onResult}>정산 결과 보기  →</Button>
    </View>
  );
}

function Results({ people, items, onBack }) {
  const totals = useMemo(() => {
    const result = Object.fromEntries(people.map((person) => [person, 0]));
    items.forEach((item) => {
      if (!item.members.length) return;
      const share = Number(item.price) * Number(item.quantity) / item.members.length;
      item.members.forEach((person) => { result[person] += share; });
    });
    return result;
  }, [people, items]);
  const grandTotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const shareText = [`한입정산`, `총 주문 금액: ${money.format(grandTotal)}원`, "", ...Object.entries(totals).map(([person, total]) => `${person}: ${money.format(Math.round(total))}원`)].join("\n");

  return (
    <View>
      <Text style={styles.eyebrow}>STEP 03</Text>
      <Text style={styles.title}>깔끔하게 <Text style={styles.accent}>나눴어요.</Text></Text>
      <View style={styles.totalCard}><Text style={styles.totalLabel}>총 주문 금액</Text><Text style={styles.totalValue}>{money.format(grandTotal)}<Text style={styles.totalUnit}>원</Text></Text></View>
      <View style={styles.section}>
        <Text style={styles.eyebrow}>ORDER DETAILS</Text>
        <Text style={styles.sectionTitle}>메뉴별 분배 내역</Text>
        {items.filter((item) => item.menu).map((item) => {
          const share = item.members.length ? Math.round(Number(item.price) * Number(item.quantity) / item.members.length) : 0;
          return (
            <View style={[styles.card, styles.resultCard]} key={item.id}>
              <View style={styles.rowBetween}><Text style={styles.personName}>{item.menu}</Text><Text style={styles.resultMoney}>{money.format(share)}원씩</Text></View>
              <Text style={styles.meta}>{money.format(Number(item.price))}원 × {item.quantity}개 · {item.members.join(", ")}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.section}>
        <Text style={styles.eyebrow}>SETTLEMENT</Text>
        <Text style={styles.sectionTitle}>인원별 정산 금액</Text>
        <View style={styles.card}>
          {people.map((person, index) => <View style={styles.resultRow} key={person}><View style={styles.avatar}><Text style={styles.avatarText}>{index + 1}</Text></View><Text style={[styles.personName, styles.flex]}>{person}</Text><Text style={styles.resultMoney}>{money.format(Math.round(totals[person]))}원</Text></View>)}
        </View>
      </View>
      <Button onPress={() => Share.share({ message: shareText })}>정산 결과 공유하기</Button>
      <Button onPress={onBack} variant="ghost">← 수정하기</Button>
    </View>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [people, setPeople] = useState([]);
  const [items, setItems] = useState([createItem()]);
  const [drafts, setDrafts] = useState([]);
  const [currentDraftId, setCurrentDraftId] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { AsyncStorage.getItem(DRAFTS_KEY).then((value) => value && setDrafts(JSON.parse(value))).catch(() => {}); }, []);
  const saveDraft = async () => {
    const id = currentDraftId || makeId();
    const next = [{ id, people, items, updatedAt: new Date().toISOString() }, ...drafts.filter((draft) => draft.id !== id)];
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
    setDrafts(next); setCurrentDraftId(id); setSaved(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setSaved(false), 1500);
  };
  const deleteDraft = (id) => Alert.alert("임시 저장 삭제", "이 내역을 삭제할까요?", [{ text: "취소", style: "cancel" }, { text: "삭제", style: "destructive", onPress: async () => { const next = drafts.filter((draft) => draft.id !== id); setDrafts(next); await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(next)); } }]);
  const loadDraft = (draft) => { setPeople(draft.people); setItems(draft.items); setCurrentDraftId(draft.id); setStep(2); };
  const goHome = () => setStep(1);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <Header step={step} onHome={goHome} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {step === 1 && <Participants {...{ name, setName, people, setPeople, items, setItems, drafts }} onLoad={loadDraft} onDelete={deleteDraft} onNext={() => setStep(2)} />}
          {step === 2 && <Orders {...{ people, items, setItems, saved }} onBack={() => setStep(1)} onSave={saveDraft} onResult={() => setStep(3)} />}
          {step === 3 && <Results {...{ people, items }} onBack={() => setStep(2)} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f4ee" }, flex: { flex: 1 },
  header: { height: 64, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#d8d7cf" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 }, logo: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#e8ff59" }, logoText: { fontSize: 23, fontWeight: "800" }, brandText: { fontSize: 17, fontWeight: "800", color: "#24251f" }, stepText: { color: "#85857c", fontWeight: "700" },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", padding: 20, paddingTop: 42, paddingBottom: 80 },
  eyebrow: { color: "#85857c", fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: 12 }, title: { color: "#24251f", fontSize: 40, lineHeight: 45, fontWeight: "800", letterSpacing: -1.5 }, accent: { color: "#829500" }, lead: { color: "#77776e", fontSize: 14, lineHeight: 23, marginTop: 18, marginBottom: 26 },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e3e2da", borderRadius: 16, padding: 18, marginBottom: 14 }, label: { fontSize: 12, fontWeight: "700", color: "#33342e", marginBottom: 8 },
  inputRow: { flexDirection: "row", gap: 9, alignItems: "flex-end" }, input: { height: 48, borderWidth: 1, borderColor: "#dcdcd3", borderRadius: 9, paddingHorizontal: 14, backgroundColor: "#fafaf7", color: "#24251f", fontSize: 16 }, quantity: { width: 92 },
  button: { minHeight: 50, borderRadius: 10, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", marginTop: 12 }, primaryButton: { backgroundColor: "#22231f" }, secondaryButton: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cfd0c6" }, ghostButton: { backgroundColor: "transparent" }, buttonText: { fontSize: 14, fontWeight: "800" }, primaryButtonText: { color: "#fff" }, secondaryButtonText: { color: "#36372f" }, ghostButtonText: { color: "#77776e" }, disabled: { opacity: 0.35 }, pressed: { opacity: 0.75 }, addButton: { width: 50, minHeight: 48, marginTop: 0, paddingHorizontal: 0 },
  empty: { textAlign: "center", color: "#aaa99f", fontSize: 13, marginTop: 20 }, personRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 9, marginTop: 8, borderRadius: 10, backgroundColor: "#f6f6f1" }, avatar: { width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#eaff62" }, avatarText: { color: "#687500", fontSize: 11, fontWeight: "800" }, personName: { color: "#24251f", fontSize: 14, fontWeight: "700" }, deleteText: { color: "#ad6b64", fontSize: 12, fontWeight: "700" }, hint: { color: "#99998f", fontSize: 11, textAlign: "center", marginTop: 10 },
  section: { marginTop: 34 }, sectionTitle: { color: "#24251f", fontSize: 17, fontWeight: "800", marginBottom: 12 }, draft: { flexDirection: "row", alignItems: "center", gap: 12 }, meta: { color: "#88887f", fontSize: 11, marginTop: 5, lineHeight: 17 },
  orderCard: { marginTop: 16 }, rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, orderNumber: { color: "#9aab24", fontSize: 20, fontWeight: "800" }, memberHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: "#ecebe5" }, link: { color: "#819000", fontSize: 12, fontWeight: "700" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { borderWidth: 1, borderColor: "#dcdcd4", borderRadius: 20, paddingVertical: 10, paddingHorizontal: 13, backgroundColor: "#fff" }, selectedChip: { borderColor: "#b9cc32", backgroundColor: "#faffdc" }, chipText: { fontSize: 12, color: "#66675f", fontWeight: "700" }, selectedChipText: { color: "#596500" }, actionRow: { flexDirection: "row", gap: 8, marginTop: 8 }, smallButton: { flex: 1 },
  totalCard: { backgroundColor: "#22231f", borderRadius: 16, padding: 22, marginTop: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, totalLabel: { color: "#ccc", fontSize: 13 }, totalValue: { color: "#fff", fontSize: 30, fontWeight: "800" }, totalUnit: { fontSize: 13 }, resultCard: { paddingVertical: 15 }, resultMoney: { color: "#6f7e00", fontSize: 16, fontWeight: "800" }, resultRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ecece5" },
});
