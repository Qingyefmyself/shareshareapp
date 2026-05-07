// Firebase配置
// 请替换为您自己的Firebase配置
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初始化Firebase
let firebaseInitialized = false;
let database = null;

function initFirebase() {
    if (firebaseInitialized) return true;
    
    try {
        // 检查是否配置了Firebase
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.log('Firebase未配置，数据将只保存在本地');
            return false;
        }
        
        // 动态导入Firebase SDK
        import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js').then(() => {
            import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js').then(() => {
                // 初始化Firebase
                firebase.initializeApp(firebaseConfig);
                database = firebase.database();
                firebaseInitialized = true;
                console.log('Firebase初始化成功');
            });
        }).catch(error => {
            console.error('Firebase SDK加载失败:', error);
            return false;
        });
        
        return true;
    } catch (error) {
        console.error('Firebase初始化失败:', error);
        return false;
    }
}

// 同步数据到Firebase
async function syncToFirebase(userData) {
    if (!firebaseInitialized || !database) {
        console.log('Firebase未初始化，跳过同步');
        return false;
    }
    
    try {
        const userRef = database.ref('users/' + userData.id);
        await userRef.set(userData);
        console.log('数据已同步到Firebase');
        return true;
    } catch (error) {
        console.error('同步到Firebase失败:', error);
        return false;
    }
}

// 从Firebase获取所有数据
async function fetchFromFirebase() {
    if (!firebaseInitialized || !database) {
        console.log('Firebase未初始化，无法获取数据');
        return null;
    }
    
    try {
        const snapshot = await database.ref('users').once('value');
        return snapshot.val();
    } catch (error) {
        console.error('从Firebase获取数据失败:', error);
        return null;
    }
}
