import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, FlatList, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/supabase';

type Tab = 'notes' | 'cards';
export default function App() {
  const [session, setSession] = useState<Session | null>(null); const [ready, setReady] = useState(false); const [tab, setTab] = useState<Tab>('notes');
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); }); const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(s)); return () => l.subscription.unsubscribe(); }, []);
  if (!ready) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!session) return <Login />;
  return (<SafeAreaView style={{ flex: 1, padding: 16 }}><Text style={{ fontSize: 22, fontWeight: '700' }}>LUMORA</Text>
    <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}><Button title="Notes" onPress={() => setTab('notes')} /><Button title="Flashcards" onPress={() => setTab('cards')} /><Button title="Log out" onPress={() => supabase.auth.signOut()} /></View>
    {tab === 'notes' ? <Notes /> : <Cards />}</SafeAreaView>);
}
function Login() {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState('');
  return (<SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 8 }}><Text style={{ fontSize: 26, fontWeight: '700' }}>LUMORA</Text>
    <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
    <TextInput placeholder="Password" secureTextEntry value={pw} onChangeText={setPw} style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
    {!!err && <Text style={{ color: 'red' }}>{err}</Text>}
    <Button title="Log in" onPress={async () => { const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw }); if (error) setErr('Incorrect email or password.'); }} />
    <Text style={{ color: '#666' }}>Create your account on the web app first.</Text></SafeAreaView>);
}
function Notes() {
  const [rows, setRows] = useState<{ id: string; title: string }[]>([]); const [title, setTitle] = useState(''); const [err, setErr] = useState('');
  const load = async () => { const { data, error } = await supabase.from('notes').select('id,title').eq('archived', false).order('updated_at', { ascending: false }); error ? setErr('Could not load notes') : setRows(data ?? []); };
  useEffect(() => { load(); }, []);
  return (<View style={{ flex: 1 }}><View style={{ flexDirection: 'row', gap: 8 }}><TextInput placeholder="New note title" value={title} onChangeText={setTitle} style={{ flex: 1, borderWidth: 1, padding: 8, borderRadius: 8 }} />
    <Button title="Add" onPress={async () => { const u = (await supabase.auth.getUser()).data.user; if (!u || !title.trim()) return; await supabase.from('notes').insert({ owner_id: u.id, title: title.trim().slice(0, 200) }); setTitle(''); load(); }} /></View>
    {!!err && <Text style={{ color: 'red' }}>{err}</Text>}<FlatList data={rows} keyExtractor={(r) => r.id} ListEmptyComponent={<Text>No notes yet.</Text>} renderItem={({ item }) => <Text style={{ paddingVertical: 8 }}>{item.title}</Text>} /></View>);
}
function Cards() {
  const [rows, setRows] = useState<{ id: string; front: string; back: string }[]>([]); const [i, setI] = useState(0); const [show, setShow] = useState(false);
  useEffect(() => { supabase.from('flashcards').select('id,front,back').limit(200).then(({ data }) => setRows(data ?? [])); }, []);
  if (!rows.length) return <Text>No flashcards yet — add some on the web app.</Text>; const c = rows[i];
  return (<View style={{ gap: 12 }}><Text>{i + 1} / {rows.length}</Text><TouchableOpacity onPress={() => setShow(!show)} style={{ borderWidth: 1, borderRadius: 16, padding: 32, minHeight: 160, justifyContent: 'center' }}>
    <Text style={{ fontSize: 20, textAlign: 'center' }}>{show ? c.back : c.front}</Text></TouchableOpacity>
    <View style={{ flexDirection: 'row', gap: 8 }}><Button title="Prev" onPress={() => { setI((i - 1 + rows.length) % rows.length); setShow(false); }} /><Button title={show ? 'Hide' : 'Show answer'} onPress={() => setShow(!show)} />
      <Button title="Next" onPress={() => { setI((i + 1) % rows.length); setShow(false); }} /></View></View>);
}
