import { useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Linking, Platform } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '@/src/theme';
import { useApp } from '@/src/app-context';
import { api, FOOD_IMAGE, uploadImage } from '@/src/api';
import { Detection, Meal } from '@/src/types';
import { Sheet, Button, Icon, IconButton, Info, useTypography, Badge } from '@/src/components/ui';
import { MEAL_TYPES } from '@/src/components/MealCard';

const SAMPLE_OPTIONS = [['bowl', 'Denge kasesi'], ['oats', 'Yulaf kasesi'], ['snack', 'Atıştırmalık']];
const SOURCES = [ { key: 'home', icon: 'home-outline', name: 'Ev yapımı', description: 'Bildiğin malzemeler, kendi mutfağın.', fni: 95 }, { key: 'restaurant', icon: 'restaurant-outline', name: 'Restoran', description: 'Dışarıda hazırlanmış bir öğün.', fni: 65 }, { key: 'packaged', icon: 'cube-outline', name: 'Paketli', description: 'Hazır veya ambalajlı bir ürün.', fni: 30 } ];

export default function Capture({ onClose }: { onClose: () => void }) {
  const s = useStyles(); const t = useTypography(); const { colors: c } = useTheme(); const { data, refresh, notify, setTab, inspectMeal } = useApp();
  const [photo, setPhoto] = useState<string | null>(null); const [sample, setSample] = useState('bowl'); const [detection, setDetection] = useState<Detection | null>(null);
  const [tag, setTag] = useState<string | null>(null); const [mealType, setMealType] = useState('lunch');
  const [camera, setCamera] = useState(false); const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false); const requests = useRef({ camera: 0, gallery: 0 }); const cameraRef = useRef<CameraView>(null);
  const openCamera = async () => {
    setError('');
    try {
      let permission = await Camera.getCameraPermissionsAsync();
      if (!permission.granted && permission.canAskAgain && requests.current.camera < 2) { requests.current.camera += 1; permission = await Camera.requestCameraPermissionsAsync(); }
      if (!permission.granted) { setPermissionDenied(true); setError('Kameraya erişilemiyor. İzni ayarlardan açabilir, galeriden seçebilir veya örnek öğünle devam edebilirsin.'); return; }
      setPermissionDenied(false); setReady(false); setCamera(true);
    } catch { setError('Bu cihazda kamera açılamadı. Galeriden seçebilir veya örnek öğünle devam edebilirsin.'); }
  };
  const openGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (!permission.granted && permission.canAskAgain && requests.current.gallery < 2) { requests.current.gallery += 1; permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); }
        if (!permission.granted) { setPermissionDenied(true); setError('Galeri iznini ayarlardan açabilir veya örnek öğünle devam edebilirsin.'); return; }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .75, allowsMultipleSelection: false });
      if (!result.canceled) { setPhoto(result.assets[0].uri); setError(''); }
    } catch { setError('Fotoğraf seçilemedi. Yeniden deneyebilirsin.'); }
  };
  const takePhoto = async () => { if (!ready || busy) return; setBusy(true); try { const result = await cameraRef.current?.takePictureAsync({ quality: .75 }); if (result?.uri) { setPhoto(result.uri); setCamera(false); } } catch { setCamera(false); setError('Fotoğraf çekilemedi. Tekrar dene.'); } finally { setBusy(false); } };
  const analyze = async () => {
    setBusy(true); setError('');
    try {
      const image = photo ? await uploadImage(photo) : null;
      setDetection(await api('/detect', 'POST', { sample, image_id: image?.image_id || null }));
      await refresh();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!tag || !detection || busy) return; setBusy(true);
    try { const meal = await api<Meal>('/meals', 'POST', { detection_id: detection.detection_id, tag, meal_type: mealType }); await refresh(); setTab('today'); onClose(); notify('Öğünün günlüğüne eklendi.'); inspectMeal(meal); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const limited = data?.camera_limit !== null && (data?.camera_used || 0) >= (data?.camera_limit || 5);
  if (camera) return <Modal animationType="slide" onRequestClose={() => setCamera(false)}><SafeAreaView style={s.cameraScreen} edges={['top', 'bottom']}><View style={s.cameraHeader}><Text style={s.cameraTitle}>Tabağına bir bakış.</Text><IconButton icon="close" onPress={() => setCamera(false)} testID="camera-close-button" /></View><View style={s.cameraContainer}><CameraView ref={cameraRef} style={s.cameraPreview} facing="back" onCameraReady={() => setReady(true)} onMountError={() => { setCamera(false); setError('Kamera hazır değil. Galeriden veya örnekle devam edebilirsin.'); }} /><View pointerEvents="none" style={s.cameraGuide} /></View><Text style={s.cameraHint}>Tabağını çerçeveye al. Doğal ışık yeterli.</Text><View style={s.shutterWrap}><Pressable testID="camera-shutter-button" onPress={takePhoto} disabled={!ready || busy} style={({ pressed }) => [s.shutter, (pressed || !ready) && s.pressed]}><View style={s.shutterInner} /></Pressable></View></SafeAreaView></Modal>;
  return <Sheet title={detection ? 'Son dokunuş senden.' : 'Tabağını keşfet.'} onClose={busy ? () => {} : onClose} testID={detection ? 'food-tag-sheet' : 'capture-sheet'} footer={detection ? <><Button testID="save-meal-button" title="Öğünümü kaydet" icon="checkmark" onPress={save} disabled={!tag} loading={busy} /><Text style={s.quota}>Kaynak seçimi zorunludur. Tahmini değerler tıbbi ölçüm değildir.</Text></> : <><Button testID="analyze-food-button" title={photo ? 'Fotoğrafla örnek analizi başlat' : 'Örnek öğünü analiz et'} icon="sparkles-outline" onPress={analyze} loading={busy} disabled={limited} /><Text testID="camera-remaining" style={s.quota}>{data?.camera_limit === null ? 'Pro · Sınırsız analiz' : `Bugün ${Math.max(0, 5 - (data?.camera_used || 0))} / 5 analiz hakkın var`}</Text></>}>
    {!detection ? <>
      <View style={s.photoWrap}><Image source={{ uri: photo || FOOD_IMAGE }} style={s.preview} contentFit="cover" /><View style={s.photoCaption}><Icon name="camera-outline" size={17} color={c.onSurfaceInverse} /><Text style={s.photoCaptionText}>{photo ? 'Senin fotoğrafın' : 'Örnek öğün · Renkli denge kasesi'}</Text></View></View>
      <Text style={t.body}>Kamera yalnızca öğün fotoğrafını çekmek için açılır. Fotoğrafın hesabında güvenle saklanır.</Text>
      <View style={s.photoActions}><View style={t.flex}><Button testID="open-camera-button" title="Kamerayı aç" icon="camera-outline" onPress={openCamera} secondary disabled={busy} /></View><View style={t.flex}><Button testID="open-gallery-button" title="Galeriden seç" icon="images-outline" onPress={openGallery} secondary disabled={busy} /></View></View>
      {photo && <Button testID="remove-photo-button" title="Örnekle devam et" secondary onPress={() => setPhoto(null)} disabled={busy} />}
      <View style={s.exampleBox}><Text style={t.eyebrow}>ÖRNEK ANALİZ SENARYOSU</Text><Text style={t.small}>Fotoğraf tanıma bu prototipte simüledir. Analiz, fotoğrafın içeriğine değil aşağıdaki seçimine dayanır.</Text><View style={s.samples}>{SAMPLE_OPTIONS.map(([key, label]) => <Pressable testID={`sample-${key}`} key={key} onPress={() => setSample(key)} disabled={busy} style={({ pressed }) => [s.sample, sample === key && s.sampleSelected, pressed && s.pressed]}><View style={[s.radio, sample === key && s.radioSelected]}>{sample === key && <Icon name="checkmark" size={11} color={c.onBrandPrimary} />}</View><Text style={s.sampleText}>{label}</Text></Pressable>)}</View></View>
      <Info text={error} error />
      {permissionDenied && <Button testID="permission-settings-button" title="Ayarları aç" onPress={() => { if (Platform.OS === 'web') setError('Tarayıcının adres çubuğundaki site izinlerinden kamerayı açabilirsin. Örnek öğün seçeneği her zaman kullanılabilir.'); else Linking.openSettings(); }} secondary />}
      {limited && <Info text="Bugünkü 5 analiz hakkın doldu. Yarın devam edebilir veya Ben bölümünden Pro denemesini açabilirsin." />}
    </> : <>
      <View style={s.detected}><Image source={{ uri: photo || FOOD_IMAGE }} style={s.thumb} contentFit="cover" /><View style={t.flex}><Badge text="ÖRNEK ANALİZ" /><Text testID="detected-food-name" style={[t.h3, s.foodTitle]}>{detection.name}</Text><Text style={t.small}>{detection.items.join(' · ')}</Text></View></View>
      <Text style={t.body}>Yemeğin nerede hazırlandı? Doğallık puanını senin bilgin tamamlıyor.</Text>
      <View style={s.sources}>{SOURCES.map(source => <Pressable testID={`food-tag-${source.key}`} key={source.key} onPress={() => setTag(source.key)} style={({ pressed }) => [s.source, tag === source.key && s.sourceSelected, pressed && s.pressed]}><View style={s.sourceIcon}><Icon name={source.icon as any} size={23} color={c.brandPrimary} /></View><View style={t.flex}><Text style={t.h3}>{source.name}</Text><Text style={s.sourceDescription}>{source.description}</Text></View><View style={[s.radio, tag === source.key && s.radioSelected]}>{tag === source.key && <Icon name="checkmark" size={12} color={c.onBrandPrimary} />}</View></Pressable>)}</View>
      <View style={s.mealTimes}><Text style={t.eyebrow}>HANGİ ÖĞÜN?</Text>{Object.entries(MEAL_TYPES).map(([key, label]) => <Pressable testID={`meal-type-${key}`} key={key} onPress={() => setMealType(key)} style={({ pressed }) => [s.mealTime, pressed && s.pressed]}><Icon name={mealType === key ? 'radio-button-on' : 'radio-button-off'} size={17} color={c.brandPrimary} /><Text style={s.mealTimeText}>{label}</Text></Pressable>)}</View>
      {tag && <View testID="fni-preview" style={s.fni}><Icon name="leaf-outline" size={18} color={c.brandPrimary} /><Text style={s.fniText}>FNI {SOURCES.find(source => source.key === tag)?.fni} · %60 doğallık + %40 makro denge</Text></View>}
      <Info text={error} error />
    </>}
  </Sheet>;
}
const useStyles = makeStyles(c => ({ photoWrap: { height: 158, borderRadius: 24, overflow: 'hidden' }, preview: { width: '100%', height: '100%' }, photoCaption: { position: 'absolute', bottom: 12, left: 12, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: c.overlay, flexDirection: 'row', alignItems: 'center', gap: 6 }, photoCaptionText: { fontSize: 10, color: c.onSurfaceInverse }, photoActions: { flexDirection: 'row', gap: 8 }, exampleBox: { padding: 16, backgroundColor: c.surfaceTertiary, borderRadius: 22, gap: 10 }, samples: { gap: 5 }, sample: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: c.transparent }, sampleSelected: { backgroundColor: c.surfaceSecondary, borderColor: c.border }, sampleText: { fontSize: 13, color: c.onSurface }, radio: { width: 20, height: 20, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, radioSelected: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary }, pressed: { opacity: .6 }, quota: { textAlign: 'center', fontSize: 10, color: c.muted, lineHeight: 16 }, detected: { flexDirection: 'row', gap: 14, alignItems: 'center' }, thumb: { width: 80, height: 96, borderRadius: 20 }, foodTitle: { marginTop: 8, marginBottom: 4 }, sources: { gap: 10 }, source: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 15, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, borderRadius: 23 }, sourceSelected: { backgroundColor: c.mint, borderColor: c.brandPrimary }, sourceIcon: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' }, sourceDescription: { fontSize: 10, color: c.muted, marginTop: 4, lineHeight: 16 }, mealTimes: { gap: 2 }, mealTime: { flexDirection: 'row', gap: 9, alignItems: 'center', minHeight: 44 }, mealTimeText: { fontSize: 13, color: c.onSurface }, fni: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: c.mint, padding: 12, borderRadius: 18 }, fniText: { fontSize: 10, lineHeight: 16, color: c.brandPrimary, flex: 1 }, cameraScreen: { flex: 1, backgroundColor: c.surfaceInverse }, cameraHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cameraTitle: { fontSize: 22, color: c.onSurfaceInverse }, cameraContainer: { flex: 1, marginHorizontal: 16, borderRadius: 28, overflow: 'hidden' }, cameraPreview: { flex: 1 }, cameraGuide: { position: 'absolute', width: '80%', height: '65%', left: '10%', top: '17.5%', borderWidth: 1.5, borderColor: c.onSurfaceInverse, borderRadius: 50 }, cameraHint: { color: c.onSurfaceInverse, fontSize: 12, textAlign: 'center', padding: 20 }, shutterWrap: { alignItems: 'center', paddingBottom: 24 }, shutter: { width: 78, height: 78, borderRadius: 40, borderWidth: 2, borderColor: c.onSurfaceInverse, padding: 5 }, shutterInner: { flex: 1, borderRadius: 40, backgroundColor: c.onSurfaceInverse } }));