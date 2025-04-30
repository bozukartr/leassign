// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyAespGn8xrrAPqr4WVzLpoozo7M6xHxx0k",
    authDomain: "leassign-4a0d8.firebaseapp.com",
    projectId: "leassign-4a0d8",
    storageBucket: "leassign-4a0d8.firebasestorage.app",
    messagingSenderId: "130562043051",
    appId: "1:130562043051:web:8715f72efc00f83b8b1bee",
    measurementId: "G-RBMBJS3VDZ"
  };

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Firestore referansı
const db = firebase.firestore();

// Koleksiyon referansları
const leasCollection = db.collection('leas');
const villasCollection = db.collection('villas');
const assignmentsCollection = db.collection('assignments');

// Veritabanı durumu
let dbInitialized = false;

// LocalStorage'dan Firebase'e veri aktarımı
async function migrateLocalDataToFirebase() {
    try {
        // LocalStorage'dan verileri al
        const localLeas = JSON.parse(localStorage.getItem('leas') || '[]');
        const localVillas = JSON.parse(localStorage.getItem('villas') || '[]');
        const localAssignments = JSON.parse(localStorage.getItem('assignments') || '[]');
        
        // Veri tabanında veri var mı kontrol et
        const leaSnapshot = await leasCollection.limit(1).get();
        const villasSnapshot = await villasCollection.limit(1).get();
        const assignmentsSnapshot = await assignmentsCollection.limit(1).get();
        
        // Eğer veri tabanında hiç veri yoksa, LokalStorage'daki verileri aktar
        if (leaSnapshot.empty && localLeas.length > 0) {
            console.log('LEA verilerini Firebase\'e aktarıyorum...');
            for (const lea of localLeas) {
                await leasCollection.doc(lea.id || generateId()).set(lea);
            }
        }
        
        if (villasSnapshot.empty && localVillas.length > 0) {
            console.log('Villa verilerini Firebase\'e aktarıyorum...');
            for (const villa of localVillas) {
                await villasCollection.doc(villa.id || generateId()).set(villa);
            }
        }
        
        if (assignmentsSnapshot.empty && localAssignments.length > 0) {
            console.log('Atama verilerini Firebase\'e aktarıyorum...');
            for (const assignment of localAssignments) {
                await assignmentsCollection.doc(assignment.id || generateId()).set(assignment);
            }
        }
        
        dbInitialized = true;
        console.log('Firebase veritabanı başarıyla başlatıldı ve veriler aktarıldı.');
        return true;
    } catch (error) {
        console.error('Firebase veri aktarımı sırasında hata oluştu:', error);
        return false;
    }
}

// Benzersiz ID oluşturma
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Oturum açma kontrolü
function checkAuth() {
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                console.log('Kullanıcı oturum açmış:', user.email);
                resolve(true);
            } else {
                console.log('Kullanıcı oturum açmamış.');
                resolve(false);
            }
        });
    });
}

// Anonim oturum açma
async function signInAnonymously() {
    try {
        await firebase.auth().signInAnonymously();
        console.log('Anonim oturum açıldı.');
        return true;
    } catch (error) {
        console.error('Anonim oturum açma hatası:', error);
        return false;
    }
}

// Firebase'i başlat ve anonim oturum aç
async function initializeFirebase() {
    const isAuthenticated = await checkAuth();
    
    if (!isAuthenticated) {
        await signInAnonymously();
    }
    
    // Yerel verileri Firebase'e aktar
    return migrateLocalDataToFirebase();
}

function setupReportSystem() {
    console.log("Rapor sistemi kuruldu");
    // Rapor sistemi kodları buraya gelecek
}

// firebase-config.js sonuna ekleyin
window.setupReportSystem = function() {
    console.log("Rapor sistemi kuruldu");
    // Rapor sistemi kodları buraya gelecek
} 