import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, BookOpen, CalendarDays, Check, ChevronRight,
  Clock3, Filter, Home as HomeIcon, Plus, Search, Target, TrendingUp, X,
  Button, Card, Input, ScrollView, SizableText, View, XStack, YStack,
} from '@blinkdotnew/mobile-ui';

type Trade = { id: number; symbol: string; market: string; side: 'Long' | 'Short'; pnl: number; date: string; time: string; setup: string; note: string };
const COLORS = { paper: '#edefee', card: '#ffffff', ink: '#233346', muted: '#7b7a76', line: '#e2e3df', teal: '#168b88', paleTeal: '#e2f2ef', green: '#16805e', red: '#c65f53', sand: '#d0c0a8' };
const SEED_TRADES: Trade[] = [
  { id: 1, symbol: 'BTC / USD', market: 'Crypto', side: 'Long', pnl: 248, date: 'Today', time: '10:42 AM', setup: 'Breakout retest', note: 'Waited for the retest and entered after the volume confirmation.' },
  { id: 2, symbol: 'EUR / USD', market: 'Forex', side: 'Short', pnl: -86, date: 'Today', time: '09:18 AM', setup: 'London session', note: 'Moved stop too early. Review the original risk plan next time.' },
  { id: 3, symbol: 'NVDA', market: 'Stocks', side: 'Long', pnl: 174, date: 'Yesterday', time: '02:36 PM', setup: 'Pullback', note: 'Clean pullback to support; scaled out at the planned target.' },
  { id: 4, symbol: 'GOLD', market: 'Commodities', side: 'Long', pnl: 320, date: 'Yesterday', time: '11:05 AM', setup: 'Trend continuation', note: 'Strong structure. Kept the position size within my daily limit.' },
  { id: 5, symbol: 'ETH / USD', market: 'Crypto', side: 'Short', pnl: -42, date: 'Oct 1', time: '03:24 PM', setup: 'Range rejection', note: 'Chased the move; the entry was outside my ideal zone.' },
  { id: 6, symbol: 'AAPL', market: 'Stocks', side: 'Long', pnl: 118, date: 'Sep 30', time: '10:11 AM', setup: 'Opening range', note: 'Followed the checklist and respected the take-profit.' },
  { id: 7, symbol: 'GBP / USD', market: 'Forex', side: 'Short', pnl: 92, date: 'Sep 29', time: '01:52 PM', setup: 'Supply zone', note: 'Patient entry after price rejected the zone twice.' },
  { id: 8, symbol: 'SOL / USD', market: 'Crypto', side: 'Long', pnl: -34, date: 'Sep 28', time: '04:08 PM', setup: 'Momentum', note: 'Small planned loss. No rule was broken.' },
];
const NAV = [
  { id: 'Home', label: 'Home', icon: HomeIcon }, { id: 'Journal', label: 'Journal', icon: BookOpen },
  { id: 'Goals', label: 'My goal', icon: Target }, { id: 'History', label: 'History', icon: BarChart3 },
];
const money = (n: number) => `${n < 0 ? '−' : '+'}${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))}`;
const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'code', maximumFractionDigits: 0 }).format(n);
const toCsvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const pressFeedback = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined); };

function TradeRow({ trade, onPress }: { trade: Trade; onPress: () => void }) {
  const positive = trade.pnl >= 0;
  return (
    <Button onPress={onPress} chromeless width="100%" padding={0} height="auto" backgroundColor="transparent" pressStyle={{ opacity: 0.76 }}>
      <XStack alignItems="center" justifyContent="space-between" paddingVertical="$3" borderBottomWidth={1} borderColor={COLORS.line} width="100%">
        <XStack alignItems="center" gap="$3">
          <View width={42} height={42} borderRadius={14} backgroundColor={trade.market === 'Crypto' ? '#fff2d9' : trade.market === 'Forex' ? '#e9edfa' : '#e4f2ed'} alignItems="center" justifyContent="center">
            <SizableText size={18} color={COLORS.ink} fontWeight="700">{trade.market === 'Crypto' ? '₿' : trade.market === 'Forex' ? '€' : trade.market === 'Stocks' ? '↗' : '◈'}</SizableText>
          </View>
          <YStack gap="$1" alignItems="flex-start">
            <SizableText size={15} color={COLORS.ink} fontWeight="700">{trade.symbol}</SizableText>
            <SizableText size={12} color={COLORS.muted}>{trade.side} · {trade.date}</SizableText>
          </YStack>
        </XStack>
        <YStack alignItems="flex-end" gap="$1">
          <SizableText size={14} color={positive ? COLORS.green : COLORS.red} fontWeight="700">{money(trade.pnl)}</SizableText>
          <SizableText size={11} color={COLORS.muted}>{trade.time}</SizableText>
        </YStack>
      </XStack>
    </Button>
  );
}

export default function Home() {
  const [tab, setTab] = useState('Home');
  const [trades, setTrades] = useState(SEED_TRADES);
  const [selected, setSelected] = useState<Trade | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState('Crypto');
  const [side, setSide] = useState<'Long' | 'Short'>('Long');
  const [pnlInput, setPnlInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [goal, setGoal] = useState(10000);
  const [goalInput, setGoalInput] = useState('10000');
  const [goalEdit, setGoalEdit] = useState(false);
  const [startingCapital, setStartingCapital] = useState(500000);
  const [capitalInput, setCapitalInput] = useState('500000');
  const [capitalEdit, setCapitalEdit] = useState(false);
  const [goalDone, setGoalDone] = useState(false);
  const [toast, setToast] = useState('');

  const total = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const portfolioValue = startingCapital + total;
  const winners = trades.filter((trade) => trade.pnl > 0).length;
  const winRate = trades.length ? Math.round((winners / trades.length) * 100) : 0;
  const visibleTrades = useMemo(() => trades.filter((trade) => {
    const matchesSearch = `${trade.symbol} ${trade.market} ${trade.setup}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || (filter === 'Winners' ? trade.pnl > 0 : trade.pnl < 0);
    return matchesSearch && matchesFilter;
  }), [trades, search, filter]);
  const assetClassTotals = useMemo(() => Object.entries(trades.reduce<Record<string, number>>((totals, trade) => {
    totals[trade.market] = (totals[trade.market] ?? 0) + trade.pnl;
    return totals;
  }, {})).sort((a, b) => b[1] - a[1]), [trades]);
  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(''), 2300); };
  const openAdd = () => { pressFeedback(); setAddOpen(true); };
  const saveTrade = () => {
    if (!symbol.trim() || !pnlInput || Number.isNaN(Number(pnlInput))) { notify('Symbol and a valid P&L are required.'); return; }
    const now = new Date();
    const row: Trade = { id: Date.now(), symbol: symbol.trim().toUpperCase(), market, side, pnl: Number(pnlInput), date: 'Just now', time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), setup: 'New entry', note: noteInput.trim() || 'Trade added to your journal.' };
    setTrades((current) => [row, ...current]); setSymbol(''); setPnlInput(''); setNoteInput(''); setAddOpen(false); setTab('Journal'); notify('Trade saved to your journal.');
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };
  const saveGoal = () => { const next = Number(goalInput); if (next > 0) { setGoal(next); setGoalEdit(false); notify('Your goal was updated.'); } else notify('Enter a goal above zero.'); };
  const saveCapital = () => { const next = Number(capitalInput); if (Number.isFinite(next) && next > 0) { setStartingCapital(next); setCapitalEdit(false); notify('Starting portfolio balance updated.'); } else notify('Enter a balance above zero.'); };
  const openTrade = (trade: Trade) => { pressFeedback(); setSelected(trade); setNoteDraft(trade.note); setEditingNote(false); };
  const saveTradeNote = () => {
    if (!selected) return;
    const updated = { ...selected, note: noteDraft.trim() || 'No note added.' };
    setTrades((current) => current.map((trade) => trade.id === selected.id ? updated : trade));
    setSelected(updated); setEditingNote(false); notify('Trade note saved.');
  };
  const exportJournal = async () => {
    const rows = [['Symbol', 'Asset class', 'Direction', 'P&L (INR)', 'Date', 'Time', 'Setup', 'Note'], ...trades.map((trade) => [trade.symbol, trade.market, trade.side, trade.pnl.toFixed(2), trade.date, trade.time, trade.setup, trade.note])];
    const csv = `\uFEFF${rows.map((row) => row.map(toCsvCell).join(',')).join('\r\n')}`;
    const filename = `trading-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export trading journal' });
        else { notify('CSV file was created, but sharing is unavailable on this device.'); return; }
      }
      notify('Your journal CSV is ready to export.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not export the journal.');
    }
  };

  return (
    <YStack flex={1} backgroundColor={COLORS.paper} alignItems="center">
      <YStack flex={1} width="100%" maxWidth={520} backgroundColor={COLORS.paper}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$5" paddingTop="$4" paddingBottom="$3">
          <XStack alignItems="center" gap="$3">
            <View width={38} height={38} borderRadius={13} backgroundColor={COLORS.ink} alignItems="center" justifyContent="center"><TrendingUp size={20} color="#ffffff" /></View>
            <YStack gap="$1"><SizableText size={18} color={COLORS.ink} fontWeight="800" letterSpacing={-0.4}>Trade Journal</SizableText><SizableText size={11} color={COLORS.muted}>YOUR EDGE, IN FOCUS</SizableText></YStack>
          </XStack>
          <Button onPress={() => notify('Welcome back, Samantha.')} circular width={42} height={42} backgroundColor="#e3e4e0" pressStyle={{ opacity: 0.75 }}><SizableText size={15} color={COLORS.ink} fontWeight="700">SL</SizableText></Button>
        </XStack>

        {toast ? <View position="absolute" top={72} left={20} right={20} zIndex={5} backgroundColor={COLORS.ink} padding="$3" borderRadius={14}><SizableText size={13} color="#ffffff" textAlign="center">{toast}</SizableText></View> : null}

        <ScrollView flex={1} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          {tab === 'Home' ? <YStack gap="$4" paddingTop="$2">
            <XStack justifyContent="space-between" alignItems="flex-end">
              <YStack gap="$1"><SizableText size={13} color={COLORS.muted}>Saturday, October 3</SizableText><SizableText size={27} color={COLORS.ink} fontWeight="800" letterSpacing={-0.7}>Good evening, Sam</SizableText></YStack>
              <View width={44} height={44} borderRadius={16} backgroundColor="#dfece8" alignItems="center" justifyContent="center"><SizableText size={23}>✦</SizableText></View>
            </XStack>
            <Card backgroundColor={COLORS.ink} borderRadius={24} padding="$4" borderWidth={0}>
              <XStack justifyContent="space-between" alignItems="flex-start">
                <YStack gap="$2"><SizableText size={12} color="#c2cbd0">NET P&L · THIS PERIOD</SizableText><SizableText size={34} color="#ffffff" fontWeight="800" letterSpacing={-1}>{money(total)}</SizableText><XStack alignItems="center" gap="$1"><ArrowUpRight size={15} color="#79d5bd"/><SizableText size={12} color="#79d5bd" fontWeight="700">+12.8%</SizableText><SizableText size={12} color="#c2cbd0">vs. last period</SizableText></XStack></YStack>
                <View width={44} height={44} borderRadius={15} backgroundColor="#354859" alignItems="center" justifyContent="center"><BarChart3 size={21} color="#a0dfcf"/></View>
              </XStack>
              <XStack height={66} alignItems="flex-end" justifyContent="space-between" marginTop="$4" paddingHorizontal="$1">
                {[28, 44, 36, 62, 48, 76, 57, 88, 66, 100, 73, 91].map((height, index) => <View key={index} width="6%" height={`${height}%`} minHeight={10} borderRadius={5} backgroundColor={index === 9 ? '#89d7c2' : '#4f6979'} />)}
              </XStack>
              <XStack justifyContent="space-between" marginTop="$2"><SizableText size={10} color="#aab7bd">SEP 22</SizableText><SizableText size={10} color="#aab7bd">SEP 26</SizableText><SizableText size={10} color="#aab7bd">OCT 3</SizableText></XStack>
            </Card>
            <Card backgroundColor="#e5efec" borderRadius={18} padding="$3" borderWidth={1} borderColor="#d4e3de">
              <XStack justifyContent="space-between" alignItems="center">
                <YStack gap="$1"><SizableText size={11} color={COLORS.muted}>DEMO PORTFOLIO VALUE</SizableText><SizableText size={22} color={COLORS.ink} fontWeight="800">{formatINR(portfolioValue)}</SizableText><SizableText size={11} color={COLORS.muted}>Demo starting balance + journal P&L</SizableText></YStack>
                <Button onPress={() => { setCapitalInput(String(startingCapital)); setCapitalEdit(true); }} height={42} paddingHorizontal="$3" borderRadius={13} backgroundColor="#ffffff"><SizableText size={12} color={COLORS.teal} fontWeight="700">Set balance</SizableText></Button>
              </XStack>
            </Card>
            <XStack gap="$3">
              <Card flex={1} backgroundColor={COLORS.card} borderRadius={18} padding="$3" borderWidth={1} borderColor={COLORS.line}><SizableText size={11} color={COLORS.muted}>WIN RATE</SizableText><SizableText size={23} color={COLORS.ink} fontWeight="800" marginTop="$2">{winRate}%</SizableText><SizableText size={11} color={COLORS.green}>{winners} profitable trades</SizableText></Card>
              <Card flex={1} backgroundColor={COLORS.card} borderRadius={18} padding="$3" borderWidth={1} borderColor={COLORS.line}><SizableText size={11} color={COLORS.muted}>TOTAL TRADES</SizableText><SizableText size={23} color={COLORS.ink} fontWeight="800" marginTop="$2">{trades.length}</SizableText><SizableText size={11} color={COLORS.muted}>Across 4 markets</SizableText></Card>
            </XStack>
            <XStack justifyContent="space-between" alignItems="center" marginTop="$1"><SizableText size={18} color={COLORS.ink} fontWeight="800">My trading goal</SizableText><Button chromeless onPress={() => setTab('Goals')} height={36} paddingHorizontal="$2"><XStack alignItems="center" gap="$1"><SizableText size={12} color={COLORS.teal} fontWeight="700">View details</SizableText><ChevronRight size={15} color={COLORS.teal}/></XStack></Button></XStack>
            <Card overflow="hidden" backgroundColor={COLORS.card} borderRadius={20} padding={0} borderWidth={1} borderColor={COLORS.line}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1100&q=85' }} contentFit="cover" style={{ width: '100%', height: 138 }} />
              <YStack padding="$3" gap="$2"><XStack justifyContent="space-between"><YStack gap="$1"><SizableText size={13} color={COLORS.muted}>PROFIT TARGET</SizableText><SizableText size={20} color={COLORS.ink} fontWeight="800">{formatINR(goal)} goal</SizableText></YStack><View paddingHorizontal="$2" paddingVertical="$1" borderRadius={20} backgroundColor={COLORS.paleTeal}><SizableText size={11} color={COLORS.teal} fontWeight="700">{Math.min(100, Math.round(Math.max(total, 0) / goal * 100))}%</SizableText></View></XStack><View height={8} backgroundColor="#e7e9e5" borderRadius={6} overflow="hidden"><View height={8} width={`${Math.min(100, Math.round(Math.max(total, 0) / goal * 100))}%`} backgroundColor={COLORS.teal} borderRadius={6}/></View><SizableText size={12} color={COLORS.muted}>{formatINR(Math.max(total, 0))} earned · Keep showing up consistently.</SizableText></YStack>
            </Card>
            <XStack justifyContent="space-between" alignItems="center" marginTop="$1"><SizableText size={18} color={COLORS.ink} fontWeight="800">Recent trades</SizableText><Button chromeless onPress={() => setTab('Journal')} height={36} paddingHorizontal="$2"><SizableText size={12} color={COLORS.teal} fontWeight="700">See all</SizableText></Button></XStack>
            <Card backgroundColor={COLORS.card} borderRadius={20} paddingHorizontal="$3" borderWidth={1} borderColor={COLORS.line}>{trades.slice(0, 3).map((trade) => <TradeRow key={trade.id} trade={trade} onPress={() => openTrade(trade)}/>)}</Card>
            <Button onPress={openAdd} backgroundColor={COLORS.teal} borderRadius={16} height={52} pressStyle={{ opacity: 0.86 }}><XStack alignItems="center" gap="$2"><Plus size={19} color="#ffffff"/><SizableText size={15} color="#ffffff" fontWeight="700">Add a trade</SizableText></XStack></Button>
          </YStack> : null}

          {tab === 'Journal' || tab === 'History' ? <YStack gap="$4" paddingTop="$2">
            <YStack gap="$1"><SizableText size={13} color={COLORS.muted}>{tab === 'Journal' ? 'YOUR TRADING LOG' : 'PERFORMANCE REVIEW'}</SizableText><SizableText size={27} color={COLORS.ink} fontWeight="800" letterSpacing={-0.7}>{tab === 'Journal' ? 'Journal' : 'Trade history'}</SizableText></YStack>
            {tab === 'History' ? <Card backgroundColor={COLORS.ink} borderRadius={20} padding="$4" borderWidth={0}><SizableText size={12} color="#bdc8ce">YOUR PERFORMANCE</SizableText><XStack justifyContent="space-between" marginTop="$3"><YStack gap="$1"><SizableText size={11} color="#bdc8ce">NET P&L</SizableText><SizableText size={22} color="#ffffff" fontWeight="800">{money(total)}</SizableText></YStack><YStack gap="$1" alignItems="flex-end"><SizableText size={11} color="#bdc8ce">WIN RATE</SizableText><SizableText size={22} color="#88d8c2" fontWeight="800">{winRate}%</SizableText></YStack></XStack></Card> : null}
            {tab === 'History' ? <YStack gap="$3"><XStack justifyContent="space-between" alignItems="center"><SizableText size={17} color={COLORS.ink} fontWeight="800">P&L by asset class</SizableText><SizableText size={11} color={COLORS.muted}>INR</SizableText></XStack><Card backgroundColor={COLORS.card} borderRadius={18} paddingHorizontal="$3" borderWidth={1} borderColor={COLORS.line}>{assetClassTotals.map(([assetClass, pnl]) => <XStack key={assetClass} alignItems="center" justifyContent="space-between" paddingVertical="$3" borderBottomWidth={1} borderColor={COLORS.line}><YStack gap="$1"><SizableText size={14} color={COLORS.ink} fontWeight="700">{assetClass}</SizableText><SizableText size={11} color={COLORS.muted}>{trades.filter((trade) => trade.market === assetClass).length} trades</SizableText></YStack><SizableText size={14} color={pnl >= 0 ? COLORS.green : COLORS.red} fontWeight="700">{money(pnl)}</SizableText></XStack>)}</Card></YStack> : null}
            <XStack alignItems="center" gap="$2" backgroundColor="#ffffff" borderRadius={15} paddingHorizontal="$3" height={48} borderWidth={1} borderColor={COLORS.line}><Search size={17} color={COLORS.muted}/><Input flex={1} value={search} onChangeText={setSearch} placeholder="Search symbol or setup" color={COLORS.ink} backgroundColor="transparent" borderWidth={0} outlineStyle="none" fontSize={14} padding={0}/><CalendarDays size={17} color={COLORS.muted}/></XStack>
            <XStack gap="$2">{['All', 'Winners', 'Losers'].map((item) => <Button key={item} onPress={() => { pressFeedback(); setFilter(item); }} height={38} paddingHorizontal="$3" borderRadius={20} backgroundColor={filter === item ? COLORS.ink : '#ffffff'} borderWidth={1} borderColor={filter === item ? COLORS.ink : COLORS.line}><XStack gap="$1" alignItems="center">{item === 'All' ? <Filter size={14} color={filter === item ? '#ffffff' :COLORS.muted}/> : null}<SizableText size={12} color={filter === item ? '#ffffff' :COLORS.ink} fontWeight="600">{item}</SizableText></XStack></Button>)}</XStack>
            <XStack justifyContent="space-between" alignItems="center"><SizableText size={13} color={COLORS.muted}>{visibleTrades.length} entries</SizableText><SizableText size={12} color={COLORS.muted}>Newest first</SizableText></XStack>
            <Button onPress={exportJournal} backgroundColor="#ffffff" borderWidth={1} borderColor={COLORS.line} borderRadius={14} height={46} pressStyle={{ opacity: 0.75 }}><SizableText size={13} color={COLORS.ink} fontWeight="700">Export journal as CSV</SizableText></Button>
            <Card backgroundColor={COLORS.card} borderRadius={20} paddingHorizontal="$3" borderWidth={1} borderColor={COLORS.line}>
              {visibleTrades.length ? visibleTrades.map((trade) => <TradeRow key={trade.id} trade={trade} onPress={() => openTrade(trade)}/>) : <YStack alignItems="center" paddingVertical="$6" gap="$2"><Search size={26} color={COLORS.muted}/><SizableText size={15} color={COLORS.ink} fontWeight="700">No matching trades</SizableText><SizableText size={13} color={COLORS.muted}>Try another symbol or filter.</SizableText></YStack>}
            </Card>
            <Button onPress={openAdd} backgroundColor={COLORS.teal} borderRadius={16} height={52} pressStyle={{ opacity: 0.86 }}><XStack alignItems="center" gap="$2"><Plus size={19} color="#ffffff"/><SizableText size={15} color="#ffffff" fontWeight="700">Add a trade</SizableText></XStack></Button>
          </YStack> : null}

          {tab === 'Goals' ? <YStack gap="$4" paddingTop="$2">
            <YStack gap="$1"><SizableText size={13} color={COLORS.muted}>A PLAN YOU CAN FOLLOW</SizableText><SizableText size={27} color={COLORS.ink} fontWeight="800" letterSpacing={-0.7}>My trading goal</SizableText></YStack>
            <Card overflow="hidden" backgroundColor={COLORS.card} borderRadius={22} padding={0} borderWidth={1} borderColor={COLORS.line}><Image source={{ uri: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1100&q=85' }} contentFit="cover" style={{ width: '100%', height: 205 }} /><YStack padding="$4" gap="$3"><XStack justifyContent="space-between" alignItems="center"><SizableText size={12} color={COLORS.muted}>PROFIT TARGET</SizableText><Button onPress={() => { setGoalInput(String(goal)); setGoalEdit(true); }} chromeless height={40}><XStack gap="$1" alignItems="center"><SizableText size={12} color={COLORS.teal} fontWeight="700">Edit goal</SizableText><ChevronRight size={15} color={COLORS.teal}/></XStack></Button></XStack><SizableText size={29} color={COLORS.ink} fontWeight="800">{formatINR(goal)} profit</SizableText><View height={10} backgroundColor="#e7e9e5" borderRadius={8} overflow="hidden"><View height={10} width={`${Math.min(100, Math.round(Math.max(total, 0) / goal * 100))}%`} backgroundColor={COLORS.teal} borderRadius={8}/></View><XStack justifyContent="space-between"><SizableText size={12} color={COLORS.muted}>{formatINR(Math.max(total, 0))} saved</SizableText><SizableText size={12} color={COLORS.muted}>{Math.min(100, Math.round(Math.max(total, 0) / goal * 100))}% complete</SizableText></XStack><Button onPress={() => { setGoalDone(true); notify('Milestone marked complete.'); }} backgroundColor={goalDone ? COLORS.green : COLORS.teal} borderRadius={14} height={48} marginTop="$1"><XStack gap="$2" alignItems="center">{goalDone ? <Check size={17} color="#ffffff"/> : null}<SizableText size={14} color="#ffffff" fontWeight="700">{goalDone ? 'Goal in progress — nice work' : 'Mark today as a win'}</SizableText></XStack></Button></YStack></Card>
            <SizableText size={18} color={COLORS.ink} fontWeight="800">Progress history</SizableText>
            <Card backgroundColor={COLORS.card} borderRadius={20} padding="$4" borderWidth={1} borderColor={COLORS.line}>
              {[{ title: 'Goal set', detail: 'Profit target created', date: 'Sep 22', color: COLORS.teal }, { title: 'First week logged', detail: '8 trades recorded', date: 'Sep 28', color: COLORS.teal }, { title: 'Keep building your edge', detail: 'Your next milestone is ahead', date: 'Today', color: COLORS.sand }].map((item, index) => <XStack key={item.title} gap="$3" paddingVertical="$2"><YStack alignItems="center" width={14}><View width={10} height={10} borderRadius={8} backgroundColor={item.color} marginTop="$1"/>{index < 2 ? <View width={1} flex={1} minHeight={25} backgroundColor={COLORS.line}/> : null}</YStack><YStack flex={1} gap="$1"><SizableText size={14} color={COLORS.ink} fontWeight="700">{item.title}</SizableText><SizableText size={12} color={COLORS.muted}>{item.detail}</SizableText></YStack><SizableText size={11} color={COLORS.muted}>{item.date}</SizableText></XStack>)}
            </Card>
            <Card backgroundColor="#e8efec" borderRadius={18} padding="$3" borderWidth={0}><XStack gap="$3" alignItems="center"><View width={40} height={40} borderRadius={14} backgroundColor="#ffffff" alignItems="center" justifyContent="center"><Clock3 size={18} color={COLORS.teal}/></View><YStack flex={1} gap="$1"><SizableText size={13} color={COLORS.ink} fontWeight="700">65 days to your target date</SizableText><SizableText size={12} color={COLORS.muted}>A steady process matters more than any single trade.</SizableText></YStack></XStack></Card>
          </YStack> : null}
        </ScrollView>

        <XStack backgroundColor="#ffffff" borderTopWidth={1} borderColor={COLORS.line} paddingHorizontal="$2" paddingTop="$2" paddingBottom={Platform.OS === 'web' ? '$2' : '$3'} justifyContent="space-around" alignItems="center">
          {NAV.slice(0, 2).map((item) => { const Icon = item.icon; const active = tab === item.id; return <Button key={item.id} onPress={() => { pressFeedback(); setTab(item.id); }} chromeless height={52} width="20%"><YStack alignItems="center" gap="$1"><Icon size={19} color={active ? COLORS.teal : '#959b98'}/><SizableText size={10} color={active ? COLORS.teal : '#959b98'} fontWeight={active ? '700' : '500'}>{item.label}</SizableText></YStack></Button>; })}
          <Button onPress={openAdd} width={48} height={48} borderRadius={17} backgroundColor={COLORS.teal} pressStyle={{ opacity: 0.8 }}><Plus size={22} color="#ffffff"/></Button>
          {NAV.slice(2).map((item) => { const Icon = item.icon; const active = tab === item.id; return <Button key={item.id} onPress={() => { pressFeedback(); setTab(item.id); }} chromeless height={52} width="20%"><YStack alignItems="center" gap="$1"><Icon size={19} color={active ? COLORS.teal : '#959b98'}/><SizableText size={10} color={active ? COLORS.teal : '#959b98'} fontWeight={active ? '700' : '500'}>{item.label}</SizableText></YStack></Button>; })}
        </XStack>
      </YStack>

      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <YStack flex={1} justifyContent="flex-end" backgroundColor="rgba(20,32,42,0.42)">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <YStack maxWidth={520} width="100%" alignSelf="center" backgroundColor={COLORS.paper} borderTopLeftRadius={26} borderTopRightRadius={26} padding="$5" gap="$4">
              <XStack justifyContent="space-between" alignItems="center"><YStack gap="$1"><SizableText size={12} color={COLORS.muted}>KEEP YOUR PROCESS HONEST</SizableText><SizableText size={23} color={COLORS.ink} fontWeight="800">Add new entry</SizableText></YStack><Button circular width={42} height={42} backgroundColor="#ffffff" onPress={() => setAddOpen(false)}><X size={18} color={COLORS.ink}/></Button></XStack>
              <YStack gap="$2"><SizableText size={12} color={COLORS.ink} fontWeight="700">Symbol</SizableText><Input value={symbol} onChangeText={setSymbol} placeholder="e.g. BTC / USD" color={COLORS.ink} backgroundColor="#ffffff" borderColor={COLORS.line} borderRadius={13} height={48} outlineStyle="none"/></YStack>
              <YStack gap="$2"><SizableText size={12} color={COLORS.ink} fontWeight="700">Market</SizableText><XStack gap="$2">{['Crypto', 'Forex', 'Stocks'].map((value) => <Button key={value} onPress={() => setMarket(value)} flex={1} height={42} borderRadius={12} backgroundColor={market === value ? COLORS.ink : '#ffffff'} borderWidth={1} borderColor={market === value ? COLORS.ink : COLORS.line}><SizableText size={12} color={market === value ? '#ffffff' : COLORS.ink}>{value}</SizableText></Button>)}</XStack></YStack>
              <XStack gap="$3"><YStack flex={1} gap="$2"><SizableText size={12} color={COLORS.ink} fontWeight="700">Direction</SizableText><XStack gap="$2">{(['Long', 'Short'] as const).map((value) => <Button key={value} onPress={() => setSide(value)} flex={1} height={45} borderRadius={12} backgroundColor={side === value ? COLORS.paleTeal : '#ffffff'} borderWidth={1} borderColor={side === value ? COLORS.teal : COLORS.line}><SizableText size={13} color={side === value ? COLORS.teal : COLORS.ink} fontWeight="700">{value}</SizableText></Button>)}</XStack></YStack><YStack flex={1} gap="$2"><SizableText size={12} color={COLORS.ink} fontWeight="700">Profit / loss (INR)</SizableText><Input value={pnlInput} onChangeText={setPnlInput} placeholder="e.g. 125 or -40" keyboardType="decimal-pad" color={COLORS.ink} backgroundColor="#ffffff" borderColor={COLORS.line} borderRadius={13} height={45} outlineStyle="none"/></YStack></XStack>
              <YStack gap="$2"><SizableText size={12} color={COLORS.ink} fontWeight="700">Trade note (optional)</SizableText><Input value={noteInput} onChangeText={setNoteInput} placeholder="What went well, or what would you change?" color={COLORS.ink} backgroundColor="#ffffff" borderColor={COLORS.line} borderRadius={13} height={48} outlineStyle="none"/></YStack>
              <Button onPress={saveTrade} backgroundColor={COLORS.teal} borderRadius={15} height={52} marginTop="$1"><XStack gap="$2" alignItems="center"><Check size={18} color="#ffffff"/><SizableText size={15} color="#ffffff" fontWeight="700">Save trade</SizableText></XStack></Button>
            </YStack>
          </KeyboardAvoidingView>
        </YStack>
      </Modal>

      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <YStack flex={1} justifyContent="flex-end" backgroundColor="rgba(20,32,42,0.42)">
          {selected ? <YStack maxWidth={520} width="100%" alignSelf="center" backgroundColor={COLORS.paper} borderTopLeftRadius={26} borderTopRightRadius={26} padding="$5" gap="$4">
            <XStack justifyContent="space-between" alignItems="center"><YStack gap="$1"><SizableText size={12} color={COLORS.muted}>TRADE ENTRY DETAILS</SizableText><SizableText size={23} color={COLORS.ink} fontWeight="800">{selected.symbol}</SizableText></YStack><Button circular width={42} height={42} backgroundColor="#ffffff" onPress={() => setSelected(null)}><X size={18} color={COLORS.ink}/></Button></XStack>
            <Card backgroundColor="#ffffff" borderRadius={18} padding="$4" borderWidth={1} borderColor={COLORS.line}><XStack justifyContent="space-between" alignItems="center"><YStack gap="$1"><SizableText size={12} color={COLORS.muted}>PROFIT / LOSS</SizableText><SizableText size={26} color={selected.pnl >= 0 ? COLORS.green : COLORS.red} fontWeight="800">{money(selected.pnl)}</SizableText></YStack><View backgroundColor={COLORS.paleTeal} paddingHorizontal="$3" paddingVertical="$2" borderRadius={20}><SizableText size={12} color={COLORS.teal} fontWeight="700">{selected.side} · {selected.market}</SizableText></View></XStack></Card>
            <YStack gap="$3"><XStack justifyContent="space-between"><SizableText size={13} color={COLORS.muted}>Date & time</SizableText><SizableText size={13} color={COLORS.ink} fontWeight="600">{selected.date} · {selected.time}</SizableText></XStack><XStack justifyContent="space-between"><SizableText size={13} color={COLORS.muted}>Setup</SizableText><SizableText size={13} color={COLORS.ink} fontWeight="600">{selected.setup}</SizableText></XStack><YStack gap="$2"><XStack justifyContent="space-between" alignItems="center"><SizableText size={12} color={COLORS.muted}>YOUR NOTE</SizableText><Button chromeless height={36} onPress={() => { setNoteDraft(selected.note); setEditingNote((value) => !value); }}><SizableText size={12} color={COLORS.teal} fontWeight="700">{editingNote ? 'Cancel' : selected.note ? 'Edit note' : 'Add note'}</SizableText></Button></XStack>{editingNote ? <YStack gap="$2"><Input value={noteDraft} onChangeText={setNoteDraft} placeholder="Add reflections about this trade" multiline numberOfLines={3} color={COLORS.ink} backgroundColor="#ffffff" borderColor={COLORS.line} borderRadius={13} minHeight={80} padding="$3" outlineStyle="none"/><Button onPress={saveTradeNote} backgroundColor={COLORS.teal} borderRadius={12} height={44}><SizableText size={13} color="#ffffff" fontWeight="700">Save note</SizableText></Button></YStack> : <SizableText size={14} color={COLORS.ink} lineHeight={21}>{selected.note || 'No note added yet.'}</SizableText>}</YStack></YStack>
            <Button onPress={() => { setTrades((current) => current.filter((trade) => trade.id !== selected.id)); setSelected(null); notify('Trade removed from your journal.'); }} backgroundColor="#f8e9e6" borderRadius={14} height={48}><SizableText size={14} color={COLORS.red} fontWeight="700">Delete trade</SizableText></Button>
          </YStack> : null}
        </YStack>
      </Modal>

      <Modal visible={goalEdit} transparent animationType="fade" onRequestClose={() => setGoalEdit(false)}>
        <YStack flex={1} justifyContent="center" padding="$4" backgroundColor="rgba(20,32,42,0.42)"><YStack maxWidth={420} width="100%" alignSelf="center" backgroundColor={COLORS.paper} borderRadius={24} padding="$5" gap="$4"><XStack justifyContent="space-between" alignItems="center"><SizableText size={21} color={COLORS.ink} fontWeight="800">Update your goal</SizableText><Button circular width={40} height={40} backgroundColor="#ffffff" onPress={() => setGoalEdit(false)}><X size={17} color={COLORS.ink}/></Button></XStack><SizableText size={13} color={COLORS.muted}>Enter your profit target in INR.</SizableText><Input value={goalInput} onChangeText={setGoalInput} keyboardType="number-pad" placeholder="10000" color={COLORS.ink} backgroundColor="#ffffff" borderColor={COLORS.line} borderRadius={13} height={50} outlineStyle="none"/><Button onPress={saveGoal} backgroundColor={COLORS.teal} borderRadius={14} height={49}><SizableText size={14} color="#ffffff" fontWeight="700">Save goal</SizableText></Button></YStack></YStack>
      </Modal>
      <Modal visible={capitalEdit} transparent animationType="fade" onRequestClose={() => setCapitalEdit(false)}>
        <YStack flex={1} justifyContent="center" padding="$4" backgroundColor="rgba(20,32,42,0.42)"><YStack maxWidth={420} width="100%" alignSelf="center" backgroundColor={COLORS.paper} borderRadius={24} padding="$5" gap="$4"><XStack justifyContent="space-between" alignItems="center"><SizableText size={21} color={COLORS.ink} fontWeight="800">Starting balance</SizableText><Button circular width={40} height={40} backgroundColor="#ffffff" onPress={() => setCapitalEdit(false)}><X size={17} color={COLORS.ink}/></Button></XStack><SizableText size={13} color={COLORS.muted}>Set your opening portfolio balance in INR. Journal P&L is added to this estimate.</SizableText><Input value={capitalInput} onChangeText={setCapitalInput} keyboardType="number-pad" placeholder="500000" color={COLORS.ink} backgroundColor="#ffffff" borderColor={COLORS.line} borderRadius={13} height={50} outlineStyle="none"/><Button onPress={saveCapital} backgroundColor={COLORS.teal} borderRadius={14} height={49}><SizableText size={14} color="#ffffff" fontWeight="700">Save balance</SizableText></Button></YStack></YStack>
      </Modal>
    </YStack>
  );
}
