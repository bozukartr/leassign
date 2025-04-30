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

// Günlük Brief sistemini kur
window.setupDailyBrief = function() {
    console.log("Günlük Brief sistemi kuruldu");
    
    // Günlük Brief tarihini ayarla
    const briefDateElement = document.getElementById('briefDate');
    if (briefDateElement) {
        const today = new Date();
        briefDateElement.textContent = today.toLocaleDateString('tr-TR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    // Brief detay butonlarına olay dinleyicileri ekle
    const detailButtons = document.querySelectorAll('.brief-detail-btn');
    const closeButtons = document.querySelectorAll('.close-details-btn');
    
    detailButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            
            // Tüm detay panellerini kapat
            document.querySelectorAll('.brief-details').forEach(panel => {
                panel.classList.remove('active');
            });
            
            // Hedef paneli aç
            if (targetElement) {
                targetElement.classList.add('active');
            }
        });
    });
    
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const panel = button.closest('.brief-details');
            if (panel) {
                panel.classList.remove('active');
            }
        });
    });
    
    // Yazdır butonuna olay dinleyicisi ekle
    const printButton = document.getElementById('printBriefBtn');
    if (printButton) {
        printButton.addEventListener('click', () => {
            window.print();
        });
    }
    
    // Günlük Brief verilerini güncelle
    updateDailyBrief();
}

// Günlük Brief verilerini güncelle
window.updateDailyBrief = function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Bugün gelen misafirler
    const arrivals = assignments.filter(a => new Date(a.startDate).getTime() === today.getTime());
    document.getElementById('arrivalsCount').textContent = arrivals.length;
    
    // Bugün ayrılanlar
    const departures = assignments.filter(a => new Date(a.endDate).getTime() === today.getTime());
    document.getElementById('departuresCount').textContent = departures.length;
    
    // Doluluk
    const activeAssignments = assignments.filter(a => 
        new Date(a.startDate) <= today && new Date(a.endDate) >= today
    );
    
    const occupiedVillas = activeAssignments.length;
    const totalVillasCount = villas.length;
    const occupancyRate = Math.round((occupiedVillas / totalVillasCount) * 100);
    
    document.getElementById('occupancyRate').textContent = occupancyRate + '%';
    document.getElementById('occupiedVillas').textContent = occupiedVillas;
    document.getElementById('totalAvailableVillas').textContent = totalVillasCount;
    
    // Detay tablolarını güncelle
    updateArrivalsTable(arrivals);
    updateDeparturesTable(departures);
    updateOccupancyTable(activeAssignments);
}

// Arrivals tablosunu güncelle
function updateArrivalsTable(arrivals) {
    const tableBody = document.querySelector('#arrivalsTable tbody');
    tableBody.innerHTML = '';
    
    if (arrivals.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="no-data">Bugün gelen misafir bulunmuyor.</td></tr>';
        return;
    }
    
    arrivals.forEach(assignment => {
        const startDate = new Date(assignment.startDate);
        const endDate = new Date(assignment.endDate);
        const nights = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        const villa = villas.find(v => v.isim === assignment.villa) || { isim: assignment.villa, kategori: 'Bilinmiyor' };
        const lea = leas.find(l => l.isim === assignment.lea) || { isim: assignment.lea };
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${villa.isim}</td>
            <td>${villa.kategori}</td>
            <td>${lea.isim}</td>
            <td>14:00</td>
            <td>${nights} gece</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Departures tablosunu güncelle
function updateDeparturesTable(departures) {
    const tableBody = document.querySelector('#departuresTable tbody');
    tableBody.innerHTML = '';
    
    if (departures.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="no-data">Bugün ayrılan misafir bulunmuyor.</td></tr>';
        return;
    }
    
    departures.forEach(assignment => {
        const startDate = new Date(assignment.startDate);
        const endDate = new Date(assignment.endDate);
        const nights = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        const villa = villas.find(v => v.isim === assignment.villa) || { isim: assignment.villa, kategori: 'Bilinmiyor' };
        const lea = leas.find(l => l.isim === assignment.lea) || { isim: assignment.lea };
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${villa.isim}</td>
            <td>${villa.kategori}</td>
            <td>${lea.isim}</td>
            <td>12:00</td>
            <td>${nights} gece</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Occupancy tablosunu güncelle
function updateOccupancyTable(activeAssignments) {
    const tableBody = document.querySelector('#occupancyTable tbody');
    tableBody.innerHTML = '';
    
    // Villa tipleri için doluluk istatistikleri
    const villaTypes = {
        'Presidential': { total: 0, occupied: 0 },
        'Sunset': { total: 0, occupied: 0 },
        'Citrus': { total: 0, occupied: 0 },
        'Forest': { total: 0, occupied: 0 },
        'Maki': { total: 0, occupied: 0 }
    };
    
    // Tüm villaları dolaş ve tipine göre say
    villas.forEach(villa => {
        const type = getVillaTypeForStats(villa.kategori);
        if (villaTypes[type]) {
            villaTypes[type].total++;
        }
    });
    
    // Aktif atamaları dolaş ve tipine göre say
    activeAssignments.forEach(assignment => {
        const villa = villas.find(v => v.isim === assignment.villa);
        if (villa) {
            const type = getVillaTypeForStats(villa.kategori);
            if (villaTypes[type]) {
                villaTypes[type].occupied++;
            }
        }
    });
    
    // Doluluk oranlarını hesapla ve göster
    for (const type in villaTypes) {
        const stats = villaTypes[type];
        const rate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;
        document.getElementById(`${type.toLowerCase()}Occupancy`).textContent = rate + '%';
    }
    
    // Genel doluluk oranı
    const totalVillas = villas.length;
    const occupiedVillas = activeAssignments.length;
    const generalRate = totalVillas > 0 ? Math.round((occupiedVillas / totalVillas) * 100) : 0;
    document.getElementById('generalOccupancy').textContent = generalRate + '%';
    
    // Tablo içeriğini oluştur
    const allVillas = [...villas].sort((a, b) => a.isim.localeCompare(b.isim));
    
    allVillas.forEach(villa => {
        const assignment = activeAssignments.find(a => a.villa === villa.isim);
        const isOccupied = !!assignment;
        
        const row = document.createElement('tr');
        
        if (isOccupied) {
            const lea = leas.find(l => l.isim === assignment.lea) || { isim: assignment.lea };
            
            row.innerHTML = `
                <td>${villa.isim}</td>
                <td>${villa.kategori}</td>
                <td><span class="status-pill aktif">Dolu</span></td>
                <td>${lea.isim}</td>
                <td>${formatDate(assignment.startDate)}</td>
                <td>${formatDate(assignment.endDate)}</td>
            `;
        } else {
            row.innerHTML = `
                <td>${villa.isim}</td>
                <td>${villa.kategori}</td>
                <td><span class="status-pill geçmiş">Boş</span></td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
            `;
        }
        
        tableBody.appendChild(row);
    });
}

// İstatistikler için villa tipini belirle
function getVillaTypeForStats(kategori) {
    if (kategori.includes('Presidential')) return 'Presidential';
    if (kategori.includes('Sunset')) return 'Sunset';
    if (kategori.includes('Citrus')) return 'Citrus';
    if (kategori.includes('Forest')) return 'Forest';
    if (kategori.includes('Maki')) return 'Maki';
    return 'Sunset'; // Varsayılan
}

// Tarih formatla (Bu fonksiyon script.js'de tanımlı, ancak buraya da ekledik)
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
}

// firebase-config.js sonuna ekleyin
window.setupReportSystem = function() {
    console.log("Rapor sistemi kuruldu");
    // Rapor sistemi kodları buraya gelecek
}

// Veri yapısını kontrol et
window.checkDataStructure = async function() {
    console.log("---- VERİ YAPISI KONTROLÜ ----");
    
    // LEA verilerini kontrol et
    const leaSnapshot = await leasCollection.get();
    console.log("LEA Verileri:", leaSnapshot.docs.map(doc => doc.data()));
    
    // Villa verilerini kontrol et
    const villaSnapshot = await villasCollection.get();
    console.log("Villa Verileri:", villaSnapshot.docs.map(doc => doc.data()));
    
    // Örnek veri yapısı
    console.log("Örnek LEA Yapısı:", { id: "örnek", isim: "Örnek LEA", pozisyon: "LEA" });
    console.log("Örnek Villa Yapısı:", { id: "örnek", isim: "1711", kategori: "Maki 3", tip: "MAKI" });
}

// Lea verilerini CSV'den aktarma iyileştirilmiş fonksiyon
function parseLeas(csv) {
    const lines = csv.split('\n');
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        if (values.length >= 2) {
            const lea = {
                id: generateId(),
                isim: values[1].trim(), // isim alanı
                pozisyon: values.length > 2 ? values[2].trim() : 'LEA'
            };
            
            leas.push(lea);
            
            // Firebase'e kaydet
            leasCollection.doc(lea.id).set(lea)
                .then(() => console.log(`LEA eklendi: ${lea.isim}`))
                .catch(error => console.error('LEA ekleme hatası:', error));
        }
    }
}

// Villa verilerini CSV'den aktarma iyileştirilmiş fonksiyon
function parseVillas(csv) {
    const lines = csv.split('\n');
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        if (values.length >= 2) {
            const villa = {
                id: generateId(),
                isim: values[1].trim(), // isim alanı
                kategori: values.length > 2 ? values[2].trim() : '',
                tip: getVillaType(values.length > 2 ? values[2].trim() : '')
            };
            
            villas.push(villa);
            
            // Firebase'e kaydet
            villasCollection.doc(villa.id).set(villa)
                .then(() => console.log(`Villa eklendi: ${villa.isim}`))
                .catch(error => console.error('Villa ekleme hatası:', error));
        }
    }
}

// CSV verileri yükle - iyileştirilmiş versiyon
async function loadCSVData() {
    try {
        // Firestore'dan verileri al
        const [leaSnapshot, villaSnapshot, assignmentSnapshot] = await Promise.all([
            leasCollection.get(),
            villasCollection.get(),
            assignmentsCollection.get()
        ]);
        
        console.log("Firestore durumu:", {
            leas: leaSnapshot.empty ? "Boş" : `${leaSnapshot.docs.length} kayıt var`,
            villas: villaSnapshot.empty ? "Boş" : `${villaSnapshot.docs.length} kayıt var`,
            assignments: assignmentSnapshot.empty ? "Boş" : `${assignmentSnapshot.docs.length} kayıt var`
        });
        
        // Firestore'dan verileri parse et
        if (!leaSnapshot.empty) {
            leas = leaSnapshot.docs.map(doc => {
                const data = doc.data();
                console.log("LEA verisi:", data);
                return { id: doc.id, ...data };
            });
        } else {
            // Firestore'da veri yoksa CSV'den yükle
            console.log("LEA verileri CSV'den yükleniyor...");
            await fetchCSVData('leas.csv', parseLeas);
        }
        
        if (!villaSnapshot.empty) {
            villas = villaSnapshot.docs.map(doc => {
                const data = doc.data();
                console.log("Villa verisi:", data);
                return { id: doc.id, ...data };
            });
        } else {
            // Firestore'da veri yoksa CSV'den yükle
            console.log("Villa verileri CSV'den yükleniyor...");
            await fetchCSVData('villas.csv', parseVillas);
        }
        
        // UI'ı güncelle
        console.log("Verileri göstermeden önce durum:", {
            leas: leas.length > 0 ? `${leas.length} LEA yüklendi` : "LEA yok",
            villas: villas.length > 0 ? `${villas.length} Villa yüklendi` : "Villa yok"
        });
        
        updateSelects();
        updateUI();
        
        return true;
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        return false;
    }
}

// Select elementlerini daha güvenli güncelleme
window.updateSelects = function() {
    const leaSelect = document.getElementById('leaSelect');
    const secondaryLeaSelect = document.getElementById('secondaryLeaSelect');
    const villaSelect = document.getElementById('villaSelect');
    
    if (!leaSelect || !secondaryLeaSelect || !villaSelect) {
        console.error("Select elementleri bulunamadı!");
        return;
    }
    
    // LEA Select'i güncelle
    leaSelect.innerHTML = '<option value="">LEA Seçin</option>';
    
    if (leas && leas.length > 0) {
        console.log("LEA seçenekleri ekleniyor:", leas);
        
        leas.sort((a, b) => {
            if (a.isim && b.isim) return a.isim.localeCompare(b.isim);
            return 0;
        }).forEach(lea => {
            if (!lea.isim) {
                console.warn("İsimsiz LEA:", lea);
                return;
            }
            
            const option = document.createElement('option');
            option.value = lea.isim;
            option.textContent = lea.isim;
            leaSelect.appendChild(option);
        });
    } else {
        console.warn("LEA verisi yok!");
    }
    
    // İkinci LEA Select'i güncelle
    secondaryLeaSelect.innerHTML = '<option value="">İkinci LEA Seçin (Opsiyonel)</option>';
    
    if (leas && leas.length > 0) {
        leas.sort((a, b) => {
            if (a.isim && b.isim) return a.isim.localeCompare(b.isim);
            return 0;
        }).forEach(lea => {
            if (!lea.isim) return;
            
            const option = document.createElement('option');
            option.value = lea.isim;
            option.textContent = lea.isim;
            secondaryLeaSelect.appendChild(option);
        });
    }
    
    // Villa Select'i güncelle
    villaSelect.innerHTML = '<option value="">Villa Seçin</option>';
    
    if (villas && villas.length > 0) {
        console.log("Villa seçenekleri ekleniyor:", villas);
        
        villas.sort((a, b) => {
            if (a.isim && b.isim) return a.isim.localeCompare(b.isim);
            return 0;
        }).forEach(villa => {
            if (!villa.isim) {
                console.warn("İsimsiz Villa:", villa);
                return;
            }
            
            const option = document.createElement('option');
            option.value = villa.isim;
            option.textContent = `${villa.isim} ${villa.kategori ? '(' + villa.kategori + ')' : ''}`;
            villaSelect.appendChild(option);
        });
    } else {
        console.warn("Villa verisi yok!");
    }
}