// Global Değişkenler
let leas = [];
let villas = [];
let assignments = [];
let editingAssignment = null;

// Villa Tipleri
const VILLA_TYPES = {
    PRESIDENTIAL: 'Presidential',
    SUNSET: 'Sunset',
    CITRUS: 'Citrus',
    FOREST: 'Forest',
    MAKI: 'Maki'
};

// Sayfa yüklendiğinde CSV verileri yükle ve tarihleri ayarla
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Firebase'i başlat
        await initializeFirebase();
        
        // Veri yükle
        await loadCSVData();
        setDefaultDates();
        setupReportSystem();
        setupDailyBrief();
        
        // UI elemanlarına olay dinleyicileri ekle
        setupEventListeners();
        
        // Real-time veri güncellemelerini dinle
        setupRealtimeListeners();
    } catch (error) {
        console.error("Uygulama başlatılırken hata oluştu:", error);
        Swal.fire({
            title: 'Bağlantı Hatası',
            text: 'Veri tabanına bağlanırken bir sorun oluştu. Lütfen internet bağlantınızı kontrol edin.',
            icon: 'error',
            confirmButtonText: 'Tamam'
        });
    }
});

// UI elemanlarına olay dinleyicileri ekle
function setupEventListeners() {
    // Form elemanları
    const assignmentForm = document.getElementById('assignmentForm');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const filterBadges = document.querySelectorAll('.filter-badge');
    
    // Atama formuna olay dinleyicisi ekle
    assignmentForm.addEventListener('submit', handleAssignmentSubmit);
    
    // İptal butonuna event listener ekle
    cancelEditBtn.addEventListener('click', cancelEdit);
    
    // Arama ve filtrelemeye event listener ekle
    searchInput.addEventListener('input', updateAssignments);
    statusFilter.addEventListener('change', updateAssignments);
    
    // Filtre badge'larına event listener ekle
    filterBadges.forEach(badge => {
        badge.addEventListener('click', () => {
            // Aktif badge'ı güncelle
            filterBadges.forEach(b => b.classList.remove('active'));
            badge.classList.add('active');
            
            // Statüs filtresini güncelle
            const filterValue = badge.getAttribute('data-filter');
            statusFilter.value = filterValue;
            
            // Atamaları güncelle
            updateAssignments();
        });
    });
}

// Real-time veri güncellemelerini dinle
function setupRealtimeListeners() {
    // LEA koleksiyonundaki değişiklikleri dinle
    leasCollection.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            const data = change.doc.data();
            
            if (change.type === 'added' || change.type === 'modified') {
                // LEA eklenmiş veya güncellenmiş
                const index = leas.findIndex(lea => lea.id === change.doc.id);
                if (index !== -1) {
                    leas[index] = { id: change.doc.id, ...data };
                } else {
                    leas.push({ id: change.doc.id, ...data });
                }
            } else if (change.type === 'removed') {
                // LEA silinmiş
                leas = leas.filter(lea => lea.id !== change.doc.id);
            }
        });
        
        // UI'ı güncelle
        updateSelects();
        updateQuickStats();
        updateLeaStats();
    }, error => {
        console.error("LEA verileri dinlenirken hata:", error);
    });
    
    // Villa koleksiyonundaki değişiklikleri dinle
    villasCollection.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            const data = change.doc.data();
            
            if (change.type === 'added' || change.type === 'modified') {
                // Villa eklenmiş veya güncellenmiş
                const index = villas.findIndex(villa => villa.id === change.doc.id);
                if (index !== -1) {
                    villas[index] = { id: change.doc.id, ...data };
                } else {
                    villas.push({ id: change.doc.id, ...data });
                }
            } else if (change.type === 'removed') {
                // Villa silinmiş
                villas = villas.filter(villa => villa.id !== change.doc.id);
            }
        });
        
        // UI'ı güncelle
        updateSelects();
        updateQuickStats();
        updateDailyBrief();
    }, error => {
        console.error("Villa verileri dinlenirken hata:", error);
    });
    
    // Atama koleksiyonundaki değişiklikleri dinle
    assignmentsCollection.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            const data = change.doc.data();
            
            if (change.type === 'added' || change.type === 'modified') {
                // Atama eklenmiş veya güncellenmiş
                const index = assignments.findIndex(assignment => assignment.id === change.doc.id);
                if (index !== -1) {
                    assignments[index] = { id: change.doc.id, ...data };
                } else {
                    assignments.push({ id: change.doc.id, ...data });
                }
            } else if (change.type === 'removed') {
                // Atama silinmiş
                assignments = assignments.filter(assignment => assignment.id !== change.doc.id);
            }
        });
        
        // UI'ı güncelle
        updateUI();
        updateQuickStats();
        updateLeaStats();
        updateDailyBrief();
    }, error => {
        console.error("Atama verileri dinlenirken hata:", error);
    });
}

// CSV verileri yükle - Firebase ve CSV hibrit kullanım
async function loadCSVData() {
    try {
        // Firestore'dan verileri al
        const [leaSnapshot, villaSnapshot, assignmentSnapshot] = await Promise.all([
            leasCollection.get(),
            villasCollection.get(),
            assignmentsCollection.get()
        ]);
        
        // Firestore'dan verileri parse et
        if (!leaSnapshot.empty) {
            leas = leaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            // Firestore'da veri yoksa CSV'den yükle
            await fetchCSVData('leas.csv', parseLeas);
        }
        
        if (!villaSnapshot.empty) {
            villas = villaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            // Firestore'da veri yoksa CSV'den yükle
            await fetchCSVData('villas.csv', parseVillas);
        }
        
        if (!assignmentSnapshot.empty) {
            assignments = assignmentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            // Firestore'da atama yoksa localStorage'dan yükle
            loadFromLocalStorage();
        }
        
        // UI'ı güncelle
        updateUI();
        updateSelects();
        updateQuickStats();
        updateLeaStats();
        
        console.log('Veriler başarıyla yüklendi:', {
            leas: leas.length,
            villas: villas.length,
            assignments: assignments.length
        });
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        Swal.fire({
            title: 'Veri Yükleme Hatası',
            text: 'Veriler yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.',
            icon: 'error',
            confirmButtonText: 'Tamam'
        });
    }
}

async function fetchCSVData(url, parseFunc) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`CSV yükleme hatası: ${response.status}`);
        }
        const csvText = await response.text();
        parseFunc(csvText);
    } catch (error) {
        console.error(`${url} yüklenirken hata:`, error);
        throw error;
    }
}

function parseLeas(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        const lea = {
            id: generateId(),
            isim: values[0].trim(),
            pozisyon: values[1] ? values[1].trim() : ''
        };
        
        leas.push(lea);
        
        // Firebase'e kaydet
        leasCollection.doc(lea.id).set(lea)
            .then(() => console.log(`LEA eklendi: ${lea.isim}`))
            .catch(error => console.error('LEA ekleme hatası:', error));
    }
}

function parseVillas(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        const villa = {
            id: generateId(),
            isim: values[0].trim(),
            kategori: values[1] ? values[1].trim() : '',
            tip: getVillaType(values[1] ? values[1].trim() : '')
        };
        
        villas.push(villa);
        
        // Firebase'e kaydet
        villasCollection.doc(villa.id).set(villa)
            .then(() => console.log(`Villa eklendi: ${villa.isim}`))
            .catch(error => console.error('Villa ekleme hatası:', error));
    }
}

function getVillaType(kategori) {
    if (kategori.includes('Presidential')) return VILLA_TYPES.PRESIDENTIAL;
    if (kategori.includes('Sunset')) return VILLA_TYPES.SUNSET;
    if (kategori.includes('Citrus')) return VILLA_TYPES.CITRUS;
    if (kategori.includes('Forest')) return VILLA_TYPES.FOREST;
    if (kategori.includes('Maki')) return VILLA_TYPES.MAKI;
    return VILLA_TYPES.SUNSET; // Varsayılan
}

// Firebase'e veri kaydet
async function saveToFirestore(collection, data) {
    try {
        if (!data.id) {
            data.id = generateId();
        }
        
        await db.collection(collection).doc(data.id).set(data);
        return true;
    } catch (error) {
        console.error(`Firestore kaydetme hatası (${collection}):`, error);
        return false;
    }
}

// Geçici olarak LocalStorage'a yedekleme yap
function saveToLocalStorage() {
    try {
        localStorage.setItem('assignments', JSON.stringify(assignments));
        return true;
    } catch (error) {
        console.error('LocalStorage kaydetme hatası:', error);
        return false;
    }
}

// LocalStorage'dan atama verilerini yükle
function loadAssignmentsFromStorage() {
    try {
        const storedAssignments = localStorage.getItem('assignments');
        if (storedAssignments) {
            assignments = JSON.parse(storedAssignments);
        }
    } catch (error) {
        console.error('LocalStorage okuma hatası:', error);
    }
}

// Tüm kayıtlı verileri LocalStorage'dan yükle
function loadFromLocalStorage() {
    loadAssignmentsFromStorage();
}

// Atama işlemi
async function handleAssignmentSubmit(e) {
    e.preventDefault();
    
    const leaSelect = document.getElementById('leaSelect');
    const secondaryLeaSelect = document.getElementById('secondaryLeaSelect');
    const villaSelect = document.getElementById('villaSelect');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    const lea = leaSelect.value;
    const secondaryLea = secondaryLeaSelect.value; // İkinci LEA (opsiyonel)
    const villa = villaSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!lea || !villa || !startDate || !endDate) {
        Swal.fire({
            title: 'Uyarı',
            text: 'Lütfen tüm zorunlu alanları doldurun!',
            icon: 'warning',
            confirmButtonText: 'Tamam'
        });
        return;
    }

    // Ana LEA ve ikinci LEA aynı olamaz
    if (secondaryLea && secondaryLea === lea) {
        Swal.fire({
            title: 'Uyarı',
            text: 'Ana LEA ve ikinci LEA aynı olamaz!',
            icon: 'warning',
            confirmButtonText: 'Tamam'
        });
        return;
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    if (startDateTime >= endDateTime) {
        Swal.fire({
            title: 'Uyarı',
            text: 'Başlangıç tarihi bitiş tarihinden önce olmalıdır!',
            icon: 'warning',
            confirmButtonText: 'Tamam'
        });
        return;
    }

    // Eğer atama düzenleniyorsa, tarih çakışması kontrolünden mevcut atamayı hariç tutmalıyız
    // Tarih çakışması kontrolü
    const isOverlapping = assignments.some(assignment => {
        // Eğer düzenlenen atama ise, kendisiyle çakışma kontrolü yapma
        if (editingAssignment && assignment.id === editingAssignment.id) {
            return false;
        }
        
        return assignment.villa === villa &&
            new Date(startDate) <= new Date(assignment.endDate) &&
            new Date(endDate) >= new Date(assignment.startDate);
    });

    if (isOverlapping) {
        Swal.fire({
            title: 'Uyarı',
            text: 'Bu tarih aralığında villa zaten atanmış!',
            icon: 'warning',
            confirmButtonText: 'Tamam'
        });
        return;
    }

    // Loading göster
    Swal.fire({
        title: 'İşleniyor',
        text: 'Atama kaydediliyor...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const assignmentForm = document.getElementById('assignmentForm');
        
        if (editingAssignment) {
            // Mevcut atamayı güncelle
            const updatedAssignment = {
                ...editingAssignment,
                lea,
                secondaryLea: secondaryLea || null, // İkinci LEA
                villa,
                startDate,
                endDate,
                updatedAt: new Date().toISOString()
            };
            
            // Firebase'de güncelle
            await assignmentsCollection.doc(updatedAssignment.id).update(updatedAssignment);
            
            // Düzenleme modundan çık
            editingAssignment = null;
            document.querySelector('.assign-btn').innerHTML = '<i class="fas fa-plus"></i> Atama Yap';
            document.getElementById('cancelEditBtn').style.display = 'none';
            document.querySelector('.quick-assign').classList.remove('editing');
        } else {
            // Yeni atama oluştur
            const newAssignment = {
                id: generateId(),
                lea,
                secondaryLea: secondaryLea || null, // İkinci LEA
                villa,
                startDate,
                endDate,
                createdAt: new Date().toISOString()
            };
            
            // Firebase'e kaydet
            await assignmentsCollection.doc(newAssignment.id).set(newAssignment);
        }
        
        // Formu sıfırla
        assignmentForm.reset();
        setDefaultDates();
        
        Swal.fire({
            title: 'Başarılı',
            text: editingAssignment ? 'Atama güncellendi!' : 'Yeni atama oluşturuldu!',
            icon: 'success',
            confirmButtonText: 'Tamam',
            timer: 1500,
            timerProgressBar: true
        });
    } catch (error) {
        console.error('Atama kaydetme hatası:', error);
        
        Swal.fire({
            title: 'Hata',
            text: 'Atama kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.',
            icon: 'error',
            confirmButtonText: 'Tamam'
        });
        
        // Yedek olarak LocalStorage'a kaydet
        saveToLocalStorage();
    }
}

// Atamayı düzenleme için hazırla
function editAssignment(id) {
    const assignment = assignments.find(a => a.id === id);
    if (!assignment) return;
    
    // Form elemanlarını seç
    const leaSelect = document.getElementById('leaSelect');
    const secondaryLeaSelect = document.getElementById('secondaryLeaSelect');
    const villaSelect = document.getElementById('villaSelect');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    
    // Düzenlenen atamayı kaydet
    editingAssignment = assignment;
    
    // Form alanlarını doldur
    leaSelect.value = assignment.lea;
    secondaryLeaSelect.value = assignment.secondaryLea || '';
    villaSelect.value = assignment.villa;
    startDateInput.value = assignment.startDate;
    endDateInput.value = assignment.endDate;
    
    // UI'ı güncelle
    document.querySelector('.assign-btn').innerHTML = '<i class="fas fa-save"></i> Güncelle';
    cancelEditBtn.style.display = 'inline-flex';
    document.querySelector('.quick-assign').classList.add('editing');
    
    // Form bölümüne kaydır
    document.querySelector('.quick-assign').scrollIntoView({ behavior: 'smooth' });
}

// Atamayı sil
async function deleteAssignment(id) {
    try {
        const result = await Swal.fire({
            title: 'Emin misiniz?',
            text: "Bu atamayı silmek istediğinizden emin misiniz?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil',
            cancelButtonText: 'İptal',
            confirmButtonColor: '#c62828',
            cancelButtonColor: '#6c757d'
        });
        
        if (result.isConfirmed) {
            // Loading göster
            Swal.fire({
                title: 'İşleniyor',
                text: 'Atama siliniyor...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            // Firebase'den sil
            await assignmentsCollection.doc(id).delete();
            
            // Düzenleme modundan çık
            if (editingAssignment && editingAssignment.id === id) {
                editingAssignment = null;
                document.querySelector('.assign-btn').innerHTML = '<i class="fas fa-plus"></i> Atama Yap';
                document.getElementById('cancelEditBtn').style.display = 'none';
                document.querySelector('.quick-assign').classList.remove('editing');
                document.getElementById('assignmentForm').reset();
                setDefaultDates();
            }
            
            Swal.fire({
                title: 'Silindi!',
                text: 'Atama başarıyla silindi.',
                icon: 'success',
                confirmButtonText: 'Tamam',
                timer: 1500,
                timerProgressBar: true
            });
        }
    } catch (error) {
        console.error('Atama silme hatası:', error);
        
        Swal.fire({
            title: 'Hata',
            text: 'Atama silinirken bir sorun oluştu. Lütfen tekrar deneyin.',
            icon: 'error',
            confirmButtonText: 'Tamam'
        });
    }
}

// UI'ı güncelle
function updateUI() {
    updateAssignments();
    updateLeaStats();
}

// İstatistik sayaçlarını güncelle
function updateQuickStats() {
    // Toplam LEA sayısı
    document.getElementById('totalLeas').textContent = leas.length;
    
    // Toplam villa sayısı
    document.getElementById('totalVillas').textContent = villas.length;
    
    // Aktif atama sayısı
    const today = new Date();
    const active = assignments.filter(assignment => {
        return new Date(assignment.startDate) <= today && new Date(assignment.endDate) >= today;
    });
    document.getElementById('activeAssignments').textContent = active.length;
}

// Select elementlerini güncelle
function updateSelects() {
    const leaSelect = document.getElementById('leaSelect');
    const secondaryLeaSelect = document.getElementById('secondaryLeaSelect');
    const villaSelect = document.getElementById('villaSelect');
    
    // LEA Select'i güncelle
    leaSelect.innerHTML = '<option value="">LEA Seçin</option>';
    leas.sort((a, b) => a.isim.localeCompare(b.isim)).forEach(lea => {
        const option = document.createElement('option');
        option.value = lea.isim;
        option.textContent = lea.isim;
        leaSelect.appendChild(option);
    });
    
    // İkinci LEA Select'i güncelle
    secondaryLeaSelect.innerHTML = '<option value="">İkinci LEA Seçin (Opsiyonel)</option>';
    leas.sort((a, b) => a.isim.localeCompare(b.isim)).forEach(lea => {
        const option = document.createElement('option');
        option.value = lea.isim;
        option.textContent = lea.isim;
        secondaryLeaSelect.appendChild(option);
    });
    
    // Villa Select'i güncelle
    villaSelect.innerHTML = '<option value="">Villa Seçin</option>';
    villas.sort((a, b) => a.isim.localeCompare(b.isim)).forEach(villa => {
        const option = document.createElement('option');
        option.value = villa.isim;
        option.textContent = `${villa.isim} (${villa.kategori})`;
        villaSelect.appendChild(option);
    });
}

// Atama kartlarını güncelle
function updateAssignments() {
    // Container elementini seç
    const assignmentsContainer = document.getElementById('assignments');
    
    // Arama ve filtre değerlerini al
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');
    
    // DOM'u temizle
    assignmentsContainer.innerHTML = '';
    
    // Filtre değerlerini al
    const statusValue = statusFilter.value;
    const searchValue = searchInput.value.toLowerCase();
    
    // Bugünün tarihini al
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filtrelenmiş atamaları al
    let filteredAssignments = assignments;
    
    // Durum filtresi
    if (statusValue !== 'all') {
        filteredAssignments = filteredAssignments.filter(assignment => {
            const startDate = new Date(assignment.startDate);
            const endDate = new Date(assignment.endDate);
            
            if (statusValue === 'aktif') {
                return startDate <= today && endDate >= today;
            } else if (statusValue === 'gelecek') {
                return startDate > today;
            } else if (statusValue === 'geçmiş') {
                return endDate < today;
            }
            
            return true;
        });
    }
    
    // Arama filtresi
    if (searchValue) {
        filteredAssignments = filteredAssignments.filter(assignment => {
            return assignment.lea.toLowerCase().includes(searchValue) || 
                   assignment.villa.toLowerCase().includes(searchValue) ||
                   (assignment.secondaryLea && assignment.secondaryLea.toLowerCase().includes(searchValue));
        });
    }
    
    // Tarih sıralaması (en güncel başta)
    filteredAssignments.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    
    // Eğer hiç atama yoksa
    if (filteredAssignments.length === 0) {
        assignmentsContainer.innerHTML = '<div class="no-data">Görüntülenecek atama bulunmuyor.</div>';
        return;
    }
    
    // Her atama için kart oluştur
    filteredAssignments.forEach(assignment => {
        const startDate = new Date(assignment.startDate);
        const endDate = new Date(assignment.endDate);
        
        // Atama durumunu belirle
        let status;
        if (startDate <= today && endDate >= today) {
            status = 'aktif';
        } else if (startDate > today) {
            status = 'gelecek';
        } else {
            status = 'geçmiş';
        }
        
        // Villa ve LEA bilgilerini bul
        const villa = villas.find(v => v.isim === assignment.villa) || { isim: assignment.villa, kategori: 'Bilinmiyor' };
        const lea = leas.find(l => l.isim === assignment.lea) || { isim: assignment.lea };
        const secondaryLea = assignment.secondaryLea ? leas.find(l => l.isim === assignment.secondaryLea) : null;
        
        // Kart div'i oluştur
        const card = document.createElement('div');
        card.className = `assignment-card ${status}`;
        
        // Kart içeriği
        card.innerHTML = `
            <div class="assignment-header">
                <h3>${villa.isim}</h3>
                <span class="status-badge">${status}</span>
            </div>
            <div class="assignment-details">
                <p><i class="fas fa-building"></i> ${villa.kategori}</p>
                <p><i class="fas fa-user"></i> ${lea.isim}</p>
                ${secondaryLea ? `<p><i class="fas fa-user-plus"></i> ${secondaryLea.isim}</p>` : ''}
                <p><i class="fas fa-calendar-day"></i> ${formatDate(assignment.startDate)} - ${formatDate(assignment.endDate)}</p>
            </div>
            <div class="assignment-actions">
                <button class="action-btn edit-btn" data-id="${assignment.id}">
                    <i class="fas fa-edit"></i> Düzenle
                </button>
                <button class="action-btn delete-btn" data-id="${assignment.id}">
                    <i class="fas fa-trash-alt"></i> Sil
                </button>
            </div>
        `;
        
        // Düzenle ve sil butonlarına event listener ekle
        assignmentsContainer.appendChild(card);
    });
    
    // Event listener'ları ekle
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = e.currentTarget.getAttribute('data-id');
            editAssignment(id);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = e.currentTarget.getAttribute('data-id');
            deleteAssignment(id);
        });
    });
}

// Bütün mevcut LEA'lar için istatistik güncelle
function updateLeaStats() {
    // DOM'u temizle
    const leaStatsContainer = document.getElementById('leaStats');
    leaStatsContainer.innerHTML = '';
    
    // Her LEA için aktif atama sayısını hesapla
    const leaStatsData = leas.map(lea => {
        const today = new Date();
        
        // Ana LEA olarak atandığı atamalar
        const mainAssignments = assignments.filter(a => 
            a.lea === lea.isim
        );
        
        // İkinci LEA olarak atandığı atamalar
        const secondaryAssignments = assignments.filter(a => 
            a.secondaryLea === lea.isim
        );
        
        // Aktif atamalar (bugün)
        const activeMainAssignments = mainAssignments.filter(a => 
            new Date(a.startDate) <= today && new Date(a.endDate) >= today
        );
        
        const activeSecondaryAssignments = secondaryAssignments.filter(a => 
            new Date(a.startDate) <= today && new Date(a.endDate) >= today
        );
        
        return {
            ...lea,
            totalAssignments: mainAssignments.length,
            activeAssignments: activeMainAssignments.length,
            secondaryAssignments: secondaryAssignments.length,
            activeSecondaryAssignments: activeSecondaryAssignments.length
        };
    });
    
    // İstatistik verilerine göre sırala (aktif atama sayısına göre, sonra toplam atama sayısına göre)
    leaStatsData.sort((a, b) => {
        if (b.activeAssignments !== a.activeAssignments) {
            return b.activeAssignments - a.activeAssignments;
        }
        return b.totalAssignments - a.totalAssignments;
    });
    
    // Her LEA için istatistik kartı oluştur
    leaStatsData.forEach(leaStat => {
        const statCard = document.createElement('div');
        statCard.className = 'lea-stat';
        
        statCard.innerHTML = `
            <h4>${leaStat.isim}</h4>
            <div class="stat-details">
                <span><i class="fas fa-calendar-check"></i> ${leaStat.activeAssignments} aktif</span>
                <span><i class="fas fa-tasks"></i> ${leaStat.totalAssignments} toplam</span>
                ${leaStat.activeSecondaryAssignments > 0 ? `<span><i class="fas fa-user-plus"></i> ${leaStat.activeSecondaryAssignments} 2. LEA</span>` : ''}
            </div>
        `;
        
        leaStatsContainer.appendChild(statCard);
    });
}

// Tarih formatla
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
}

// Varsayılan tarihleri ayarla
function setDefaultDates() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    startDateInput.valueAsDate = today;
    endDateInput.valueAsDate = tomorrow;
}

// Düzenleme işlemini iptal et
function cancelEdit() {
    const assignmentForm = document.getElementById('assignmentForm');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    
    editingAssignment = null;
    assignmentForm.reset();
    setDefaultDates();
    document.querySelector('.assign-btn').innerHTML = '<i class="fas fa-plus"></i> Atama Yap';
    cancelEditBtn.style.display = 'none';
    document.querySelector('.quick-assign').classList.remove('editing');
} 