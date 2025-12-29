import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Trash2, 
  CheckSquare, 
  Image as ImageIcon, 
  Calendar, 
  Video, 
  List, 
  ChevronRight, 
  ChevronDown, 
  FolderPlus, 
  Folder,
  Lock,
  LogOut,
  Filter,
  CheckCircle2,
  Circle
} from 'lucide-react';

// --- Firebase Initialization ---
// The environment will provide these values. 
// For local development, replace with your actual config.
const firebaseConfig = {
  apiKey: "AIzaSyDNS6_ckh2s0xcvohH0r76RH50-zFsB7sQ",
  authDomain: "my-lifelog-app.firebaseapp.com",
  projectId: "my-lifelog-app",
  storageBucket: "my-lifelog-app.firebasestorage.app",
  messagingSenderId: "15182730406",
  appId: "1:15182730406:web:cc3f5ca9caae618437d067",
  measurementId: "G-30SSP7BHLW"
};
const appId = "my-local-app"; // 自訂一個 ID 即可

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Component: PIN Entry / Setup Screen ---
const PinScreen = ({ isSetup, onSubmit }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('請輸入 6 位數字密碼');
      return;
    }

    if (isSetup) {
      if (pin !== confirmPin) {
        setError('兩次輸入的密碼不符');
        return;
      }
    }

    onSubmit(pin);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="bg-blue-100 p-4 rounded-full">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {isSetup ? '設定您的個人密碼' : '請輸入密碼解鎖'}
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          {isSetup ? '這將用於保護您的個人資料，請牢記這組 6 碼數字。' : '歡迎回來，請驗證身份。'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full text-center text-3xl tracking-widest py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="••••••"
          />
          
          {isSetup && (
            <input
              type="password"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full text-center text-3xl tracking-widest py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors mt-4"
              placeholder="再次確認"
            />
          )}

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all transform active:scale-95 shadow-lg mt-4"
          >
            {isSetup ? '設定並進入' : '解鎖'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main Application Component ---
export default function App() {
  // Auth & Security State
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading', 'setup', 'lock', 'authenticated'
  
  // Data State
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  
  // UI State
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'text', 'schedule', 'video', 'todo'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'completed', 'pending'
  
  // Modal States
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardType, setNewCardType] = useState('text');
  
  // New Card Form Data
  const [cardForm, setCardForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    date: '',
    videoUrl: '',
    todoItems: []
  });

  // New Category State
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [parentCatId, setParentCatId] = useState(null); // For nested categories

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setAuthStatus('loading');
    });
    return () => unsubscribe();
  }, []);

  // Check PIN Status in Firestore
  useEffect(() => {
    if (!user) return;

    const checkPinSettings = async () => {
      try {
        // We store user settings in a private collection
        const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'security');
        const docSnap = await getDoc(settingsRef);

        if (docSnap.exists()) {
          setAuthStatus('lock');
        } else {
          setAuthStatus('setup');
        }
      } catch (err) {
        console.error("Error checking PIN settings:", err);
      }
    };

    checkPinSettings();
  }, [user]);

  // Fetch Data (Categories & Cards)
  useEffect(() => {
    if (!user || authStatus !== 'authenticated') return;

    // Categories Listener
    const catQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'categories'));
    const unsubCat = onSnapshot(catQuery, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(cats);
    }, (error) => console.error("Cat sync error", error));

    // Cards Listener
    const cardQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'cards'));
    const unsubCards = onSnapshot(cardQuery, (snapshot) => {
      const c = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCards(c);
    }, (error) => console.error("Card sync error", error));

    return () => {
      unsubCat();
      unsubCards();
    };
  }, [user, authStatus]);

  // Handle PIN Logic
  const handlePinSubmit = async (pinInput) => {
    if (!user) return;

    const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'security');

    if (authStatus === 'setup') {
      // Create new PIN
      await setDoc(settingsRef, { pin: pinInput, createdAt: serverTimestamp() });
      setAuthStatus('authenticated');
    } else if (authStatus === 'lock') {
      // Verify PIN
      const docSnap = await getDoc(settingsRef);
      if (docSnap.exists() && docSnap.data().pin === pinInput) {
        setAuthStatus('authenticated');
      } else {
        alert("密碼錯誤，請重試");
      }
    }
  };

  // --- CRUD Operations ---

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'categories'), {
      name: newCatName,
      parentId: parentCatId || null,
      createdAt: serverTimestamp()
    });
    setNewCatName('');
    setIsAddCatOpen(false);
    setParentCatId(null);
  };

  const deleteCategory = async (catId, e) => {
    e.stopPropagation();
    if (confirm('確定刪除此類別？(這不會刪除類別內的卡片)')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'categories', catId));
    }
  };

  const addCard = async (e) => {
    e.preventDefault();
    const payload = {
      type: newCardType,
      categoryId: selectedCategoryId,
      title: cardForm.title,
      isCompleted: false,
      createdAt: serverTimestamp(),
      ...cardForm // spread specific fields
    };

    // Clean up empty fields based on type
    if (newCardType !== 'text') delete payload.imageUrl;
    if (newCardType !== 'schedule') delete payload.date;
    if (newCardType !== 'video') delete payload.videoUrl;
    if (newCardType !== 'todo') delete payload.todoItems;

    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'cards'), payload);
    setIsAddCardOpen(false);
    resetCardForm();
  };

  const toggleCardCompletion = async (card) => {
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cards', card.id), {
      isCompleted: !card.isCompleted
    });
  };

  const deleteCard = async (cardId) => {
    if (confirm('確定刪除此卡片？')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'cards', cardId));
    }
  };

  const resetCardForm = () => {
    setCardForm({
      title: '',
      content: '',
      imageUrl: '',
      date: '',
      videoUrl: '',
      todoItems: []
    });
  };

  // --- Helpers ---

  // Recursive Category Renderer
  const renderCategories = (parentId = null, depth = 0) => {
    const cats = categories.filter(c => c.parentId === parentId);
    
    if (cats.length === 0) return null;

    return (
      <ul className={`pl-${depth === 0 ? '0' : '4'} space-y-1`}>
        {cats.map(cat => (
          <li key={cat.id}>
            <div 
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedCategoryId === cat.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-700'}`}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Folder className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm font-medium">{cat.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); setParentCatId(cat.id); setIsAddCatOpen(true); }}
                  className="p-1 hover:bg-slate-200 rounded"
                  title="新增子類別"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => deleteCategory(cat.id, e)}
                  className="p-1 hover:bg-red-100 text-red-500 rounded"
                  title="刪除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            {renderCategories(cat.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  // Filter Logic
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      const matchSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (card.content && card.content.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCategoryId ? card.categoryId === selectedCategoryId : true;
      const matchType = filterType === 'all' ? true : card.type === filterType;
      
      let matchStatus = true;
      if (filterStatus === 'completed') matchStatus = card.isCompleted;
      if (filterStatus === 'pending') matchStatus = !card.isCompleted;

      return matchSearch && matchCat && matchType && matchStatus;
    });
  }, [cards, searchQuery, selectedCategoryId, filterType, filterStatus]);

  // Video ID Extractor
  const getYoutubeEmbed = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  // --- Render Views ---

  if (authStatus === 'loading') {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-500">載入中...</div>;
  }

  if (authStatus === 'setup' || authStatus === 'lock') {
    return <PinScreen isSetup={authStatus === 'setup'} onSubmit={handlePinSubmit} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900 font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            My LifeLog
          </h1>
          <button onClick={() => { setAuthStatus('lock'); }} title="鎖定並登出">
            <LogOut className="w-5 h-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <div 
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer mb-2 font-semibold ${!selectedCategoryId ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setSelectedCategoryId(null)}
          >
            <FolderPlus className="w-4 h-4" />
            <span>所有類別</span>
          </div>
          
          {renderCategories()}
        </div>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={() => { setParentCatId(null); setIsAddCatOpen(true); }}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> 新增根類別
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-2xl bg-slate-100 px-4 py-2 rounded-full focus-within:ring-2 ring-blue-500/20 transition-all">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜尋任務、卡片內容..." 
              className="bg-transparent border-none outline-none w-full text-slate-700 placeholder-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button 
            onClick={() => setIsAddCardOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-medium shadow-md shadow-blue-200 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">新增卡片</span>
          </button>
        </header>

        {/* Filters */}
        <div className="px-6 py-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-sm">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-slate-500">狀態:</span>
                <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-transparent outline-none text-slate-700 font-medium cursor-pointer"
                >
                    <option value="all">全部</option>
                    <option value="completed">已完成</option>
                    <option value="pending">未完成</option>
                </select>
            </div>
            
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-sm">
                <span className="text-slate-500">類型:</span>
                <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-transparent outline-none text-slate-700 font-medium cursor-pointer"
                >
                    <option value="all">所有類型</option>
                    <option value="text">圖文卡</option>
                    <option value="schedule">排程卡</option>
                    <option value="video">影片卡</option>
                    <option value="todo">清單卡</option>
                </select>
            </div>
        </div>

        {/* Card Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCards.map(card => (
              <div 
                key={card.id} 
                className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all hover:shadow-md ${card.isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}`}
              >
                {/* Card Header (Type Icon & Actions) */}
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {card.type === 'text' && <><ImageIcon className="w-4 h-4 text-blue-500" /> 圖文</>}
                        {card.type === 'schedule' && <><Calendar className="w-4 h-4 text-orange-500" /> 排程</>}
                        {card.type === 'video' && <><Video className="w-4 h-4 text-red-500" /> 影片</>}
                        {card.type === 'todo' && <><List className="w-4 h-4 text-green-500" /> 清單</>}
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={() => toggleCardCompletion(card)}
                            className={`p-1 rounded-full transition-colors ${card.isCompleted ? 'text-green-600 bg-green-100' : 'text-slate-300 hover:text-green-600 hover:bg-green-50'}`}
                            title="標記完成"
                        >
                            {card.isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <button onClick={() => deleteCard(card.id)} className="text-slate-400 hover:text-red-500 p-1">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                    <h3 className={`font-bold text-lg leading-tight ${card.isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                        {card.title}
                    </h3>

                    {/* Type: Text/Image */}
                    {card.type === 'text' && (
                        <>
                            {card.imageUrl && (
                                <img src={card.imageUrl} alt="card attachment" className="w-full h-32 object-cover rounded-md mb-2 bg-slate-100" />
                            )}
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{card.content}</p>
                        </>
                    )}

                    {/* Type: Schedule */}
                    {card.type === 'schedule' && (
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                             <div className="flex items-center gap-2 text-orange-700 font-medium mb-1">
                                <Calendar className="w-4 h-4" />
                                {card.date ? new Date(card.date).toLocaleString('zh-TW') : '未設定時間'}
                             </div>
                             <p className="text-sm text-slate-600 mt-2">{card.content}</p>
                        </div>
                    )}

                    {/* Type: Video */}
                    {card.type === 'video' && (
                        <div className="rounded-lg overflow-hidden bg-black aspect-video relative">
                            {getYoutubeEmbed(card.videoUrl) ? (
                                <iframe 
                                    src={getYoutubeEmbed(card.videoUrl)} 
                                    className="w-full h-full" 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-xs">
                                   <a href={card.videoUrl} target="_blank" className="underline">無法預覽，點擊開啟連結</a>
                                </div>
                            )}
                        </div>
                    )}

                     {/* Type: Todo List */}
                     {card.type === 'todo' && (
                        <ul className="space-y-2">
                            {card.todoItems && card.todoItems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                    <div className="mt-0.5 w-4 h-4 rounded border border-slate-300 flex items-center justify-center">
                                        {/* Ideally these should be toggleable individually in DB, simplified here */}
                                        <div className="w-2 h-2 bg-slate-300 rounded-sm"></div>
                                    </div>
                                    <span className="flex-1">{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
              </div>
            ))}
            
            {filteredCards.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400">
                    <p>沒有找到符合條件的任務卡片</p>
                </div>
            )}
          </div>
        </div>
      </main>

      {/* --- Modals --- */}
      
      {/* Add Category Modal */}
      {isAddCatOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">
                {parentCatId ? '新增子類別' : '新增主類別'}
            </h3>
            <form onSubmit={addCategory}>
              <input 
                autoFocus
                type="text" 
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="類別名稱"
                className="w-full border border-slate-300 rounded-lg p-2 mb-4 focus:ring-2 ring-blue-500 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddCatOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">新增</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-slate-800">新增任務卡片</h3>
            
            <form onSubmit={addCard} className="space-y-4">
                {/* Type Selector */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {['text', 'schedule', 'video', 'todo'].map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setNewCardType(t)}
                            className={`py-2 px-1 rounded-lg border text-sm font-medium transition-all ${newCardType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            {t === 'text' && '圖文'}
                            {t === 'schedule' && '排程'}
                            {t === 'video' && '影片'}
                            {t === 'todo' && '清單'}
                        </button>
                    ))}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">標題</label>
                    <input 
                        required
                        type="text" 
                        value={cardForm.title}
                        onChange={e => setCardForm({...cardForm, title: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 ring-blue-500 outline-none"
                        placeholder="輸入任務標題..."
                    />
                </div>

                {/* Dynamic Fields based on Type */}
                
                {/* Text / Image */}
                {newCardType === 'text' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">圖片網址 (選填)</label>
                            <input 
                                type="url" 
                                value={cardForm.imageUrl}
                                onChange={e => setCardForm({...cardForm, imageUrl: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 ring-blue-500 outline-none"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">內容</label>
                            <textarea 
                                value={cardForm.content}
                                onChange={e => setCardForm({...cardForm, content: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2 h-24 focus:ring-2 ring-blue-500 outline-none"
                                placeholder="詳細說明..."
                            />
                        </div>
                    </>
                )}

                {/* Schedule */}
                {newCardType === 'schedule' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">日期時間</label>
                            <input 
                                required
                                type="datetime-local" 
                                value={cardForm.date}
                                onChange={e => setCardForm({...cardForm, date: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 ring-blue-500 outline-none"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">備註</label>
                            <textarea 
                                value={cardForm.content}
                                onChange={e => setCardForm({...cardForm, content: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2 h-20 focus:ring-2 ring-blue-500 outline-none"
                            />
                        </div>
                    </>
                )}

                {/* Video */}
                {newCardType === 'video' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">影片連結 (YouTube)</label>
                        <input 
                            required
                            type="url" 
                            value={cardForm.videoUrl}
                            onChange={e => setCardForm({...cardForm, videoUrl: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 ring-blue-500 outline-none"
                            placeholder="https://www.youtube.com/watch?v=..."
                        />
                    </div>
                )}

                {/* Todo List */}
                {newCardType === 'todo' && (
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">清單項目 (每行一項)</label>
                        <textarea 
                            value={cardForm.content}
                            onChange={e => {
                                // We store raw text in content for editing, parse into todoItems on submit
                                const items = e.target.value.split('\n').filter(i => i.trim()).map(text => ({ text, done: false }));
                                setCardForm({...cardForm, content: e.target.value, todoItems: items});
                            }}
                            className="w-full border border-slate-300 rounded-lg p-2 h-32 focus:ring-2 ring-blue-500 outline-none"
                            placeholder="買牛奶&#10;去郵局&#10;倒垃圾"
                        />
                    </div>
                )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddCardOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">建立卡片</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}