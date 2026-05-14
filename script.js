// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyC6UlM6xlMQhqB4oDl-DRrs38DcNHpNZ0Q",
    authDomain: "gessay-4626c.firebaseapp.com",
    databaseURL: "https://gessay-4626c-default-rtdb.firebaseio.com",
    projectId: "gessay-4626c",
    storageBucket: "gessay-4626c.firebasestorage.app",
    messagingSenderId: "204100924888",
    appId: "1:204100924888:web:69a0d5d7a1e682b9712ead",
    measurementId: "G-CWV9EL44P0"
};

// 初始化 Firebase
let firebaseApp = null;
let database = null;

function customAlert(message) {
    const alertBox = document.getElementById('custom-alert');
    const alertMessage = document.getElementById('custom-alert-message');
    const alertOkBtn = document.getElementById('custom-alert-ok');

    if (alertBox && alertMessage && alertOkBtn) {
        alertMessage.textContent = message;
        alertBox.classList.add('show');

        alertOkBtn.onclick = function() {
            alertBox.classList.remove('show');
        };
    }
}

function initFirebase() {
    try {
        // 检查 firebase 是否已定义
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK 未加载');
            return false;
        }
        
        firebaseApp = firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        console.log('Firebase 初始化成功');
        return true;
    } catch (error) {
        console.error('Firebase 初始化失败:', error);
        return false;
    }
}

// 上传数据到 Firebase
function uploadToFirebase(userId, dataType, data) {
    if (!database) {
        console.warn('Firebase 未初始化，跳过上传');
        return false;
    }
    
    try {
        const timestamp = new Date().toISOString();
        const uploadData = {
            timestamp,
            userId,
            dataType,
            data
        };
        
        database.ref('survey_data/' + userId + '/' + dataType).set(uploadData)
            .then(function() {
                console.log(`数据上传成功: ${dataType}`);
                return true;
            })
            .catch(function(error) {
                console.error('数据上传失败:', error);
                return false;
            });
    } catch (error) {
        console.error('数据上传失败:', error);
        return false;
    }
}

// 日志记录模块
let logData = {};
let currentUserId = null;

// 用户状态跟踪
let userState = {
    feedbackCompleted: false,  // 评价任务是否完成
    feedbackCount: 0,          // 已评价次数
    evaluatedContentIds: [],    // 已评价的内容ID列表
    creationCompleted: false,  // 创作任务是否完成
    feedback1Received: false, // 是否收到第一个评价
    feedback2Received: false, // 是否收到第二个评价
    survey1Completed: false,  // 问卷1是否完成
    survey2Completed: false,   // 问卷2是否完成
    waitingForFeedback: false  // 是否正在等待评价
};

// 当前正在评价的内容
let currentFeedbackShare = null;

// 生成唯一用户ID
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// 更新任务步骤指引UI
function updateTaskGuide() {
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const taskCard = document.getElementById('current-task-card');
    const waitingArea = document.getElementById('waiting-area');
    const completeArea = document.getElementById('task-complete-area');
    const startTaskBtn = document.getElementById('start-task-btn');
    const currentTaskTitle = document.getElementById('current-task-title');
    const currentTaskDesc = document.getElementById('current-task-desc');
    const waitingMessage = document.getElementById('waiting-message');
    
    if (!step1 || !step2 || !step3) return;
    
    // 移除所有状态
    [step1, step2, step3].forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // 隐藏所有区域
    if (taskCard) taskCard.style.display = 'none';
    if (waitingArea) waitingArea.style.display = 'none';
    if (completeArea) completeArea.style.display = 'none';
    
    // 根据状态更新UI
    if (userState.survey2Completed) {
        // 所有任务完成
        step1.classList.add('completed');
        step2.classList.add('completed');
        step3.classList.add('completed');
        document.querySelector('.step-connector:nth-of-type(1)')?.classList.add('completed');
        document.querySelector('.step-connector:nth-of-type(2)')?.classList.add('completed');
        
        if (completeArea) {
            completeArea.style.display = 'block';
        }
    } else if (userState.survey1Completed || userState.feedback2Received) {
        // 任务3：查看评价并完成评价反馈（第二条反馈或问卷1已完成）
        step1.classList.add('completed');
        step2.classList.add('completed');
        step3.classList.add('active');
        
        if (taskCard) {
            taskCard.style.display = 'block';
            if (currentTaskTitle) currentTaskTitle.textContent = '当前任务：查看评价并完成评价反馈';
            if (currentTaskDesc) currentTaskDesc.textContent = '请查看收到的反馈评价，并完成最终问卷。';
            if (startTaskBtn) startTaskBtn.textContent = '查看反馈';
        }
    } else if (userState.feedback1Received) {
        // 任务3：收到第一条反馈，先查看评价
        step1.classList.add('completed');
        step2.classList.add('completed');
        step3.classList.add('active');
        
        if (taskCard) {
            taskCard.style.display = 'block';
            if (currentTaskTitle) currentTaskTitle.textContent = '当前任务：查看评价并完成评价反馈';
            if (currentTaskDesc) currentTaskDesc.textContent = '已收到第一条反馈，请查看评价内容。';
            if (startTaskBtn) startTaskBtn.textContent = '查看评价';
        }
    } else if (userState.feedbackCount > 0) {
        // 已完成任务2：评价他人（至少评价1首即完成）
        step1.classList.add('completed');
        step2.classList.add('completed');
        step3.classList.add('active');
        document.querySelector('.step-connector:nth-of-type(1)')?.classList.add('completed');
        
        if (taskCard) {
            taskCard.style.display = 'block';
            if (currentTaskTitle) currentTaskTitle.textContent = '当前任务：等待反馈或继续评价';
            if (currentTaskDesc) currentTaskDesc.textContent = `已评价 ${userState.feedbackCount} 首，可继续评价或等待他人评价。`;
            if (startTaskBtn) startTaskBtn.textContent = userState.feedback1Received ? '查看评价' : '继续评价';
        }
    } else if (userState.creationCompleted) {
        // 任务1完成，进入任务2
        step1.classList.add('completed');
        step2.classList.add('active');
        step3.classList.add('active');
        
        if (taskCard) {
            taskCard.style.display = 'block';
            if (currentTaskTitle) currentTaskTitle.textContent = '当前任务：评价他人作品';
            if (currentTaskDesc) currentTaskDesc.textContent = '您已提交创作，请先帮助评价至少1首他人的作品。';
            if (startTaskBtn) startTaskBtn.textContent = '开始评价';
        }
        
        if (waitingArea) {
            waitingArea.style.display = 'block';
            if (waitingMessage) waitingMessage.textContent = '创作已提交，正在等待反馈...';
        }
    } else {
        // 默认状态：任务1
        step1.classList.add('active');
        step2.classList.add('active');
        step3.classList.add('active');
        
        if (taskCard) {
            taskCard.style.display = 'block';
            if (currentTaskTitle) currentTaskTitle.textContent = '当前任务：创作短诗';
            if (currentTaskDesc) currentTaskDesc.textContent = '请根据提示创作一首关于春天的短诗。';
            if (startTaskBtn) startTaskBtn.textContent = '开始创作';
        }
    }
    
    // 更新连接线状态
    const connectors = document.querySelectorAll('.step-connector');
    if (connectors.length >= 2) {
        if (step1.classList.contains('completed')) {
            connectors[0].classList.add('completed');
        }
        if (step2.classList.contains('completed')) {
            connectors[1].classList.add('completed');
        }
    }
}

// 更新主页面的状态显示
function updateHomePageState() {
    updateTaskGuide();
}

// 更新"我的"页面显示用户信息
function updateProfilePage(userData) {
    if (userData) {
        const nicknameEl = document.getElementById('display-nickname');
        const genderEl = document.getElementById('display-gender');
        const interestsEl = document.getElementById('display-interests');
        const bioEl = document.getElementById('display-bio');
        
        if (nicknameEl) nicknameEl.textContent = userData.nickname || '-';
        if (genderEl) genderEl.textContent = userData.gender || '-';
        if (interestsEl) interestsEl.textContent = userData.interests || '-';
        if (bioEl) bioEl.textContent = userData.bio || '-';
    }
}

// 分组信息
let groupCounts = {1: 0, 2: 0, 3: 0, 4: 0};

// 随机分配分组（平均分配）
function assignGroup() {
    // 找出当前人数最少的组
    const minCount = Math.min(groupCounts[1], groupCounts[2], groupCounts[3], groupCounts[4]);
    const availableGroups = [];
    
    for (let i = 1; i <= 4; i++) {
        if (groupCounts[i] === minCount) {
            availableGroups.push(i);
        }
    }
    
    // 从人数最少的组中随机选一个
    const assignedGroup = availableGroups[Math.floor(Math.random() * availableGroups.length)];
    groupCounts[assignedGroup]++;
    
    return assignedGroup;
}

// 初始化用户
function initUser() {
    currentUserId = generateUserId();
    const groupId = assignGroup();
    
    logData[currentUserId] = {
        id: currentUserId,
        created_at: new Date().toISOString(),
        group_id: groupId,
        group_name: getGroupName(groupId),
        register: null,
        feedbacks: [],
        creations: [],
        survey1: null,
        survey2: null,
        feedback_responses: []
    };
    console.log('新用户初始化:', currentUserId, '分组:', groupId, getGroupName(groupId));
}

// 获取分组名称
function getGroupName(groupId) {
    const names = {
        1: 'LLM先扬后抑',
        2: 'LLM先抑后扬',
        3: '人类先扬后抑',
        4: '人类先抑后扬'
    };
    return names[groupId];
}

// 记录日志
function addLog(type, data) {
    if (!currentUserId) {
        initUser();
    }
    
    const timestamp = new Date().toISOString();
    
    switch (type) {
        case 'register':
            logData[currentUserId].register = {
                timestamp,
                data
            };
            break;
        case 'feedback':
            logData[currentUserId].feedbacks.push({
                timestamp,
                data
            });
            break;
        case 'creation':
            logData[currentUserId].creations.push({
                timestamp,
                data
            });
            break;
        case 'survey1':
            logData[currentUserId].survey1 = {
                timestamp,
                data
            };
            break;
        case 'survey2':
            logData[currentUserId].survey2 = {
                timestamp,
                data
            };
            break;
        case 'feedback_response':
            logData[currentUserId].feedback_responses.push({
                timestamp,
                data
            });
            break;
        case 'received_feedback_1':
            if (!logData[currentUserId].received_feedback_1) {
                logData[currentUserId].received_feedback_1 = {
                    timestamp,
                    data
                };
            }
            break;
        case 'received_feedback_2':
            if (!logData[currentUserId].received_feedback_2) {
                logData[currentUserId].received_feedback_2 = {
                    timestamp,
                    data
                };
            }
            break;
        case 'feedback_response_1':
            if (!logData[currentUserId].feedback_response_1) {
                logData[currentUserId].feedback_response_1 = {
                    timestamp,
                    data
                };
            }
            break;
        case 'feedback_response_2':
            if (!logData[currentUserId].feedback_response_2) {
                logData[currentUserId].feedback_response_2 = {
                    timestamp,
                    data
                };
            }
            break;
    }
    
    saveLog();
    return logData[currentUserId];
}

// 保存日志到本地存储
function saveLog() {
    localStorage.setItem('testLog', JSON.stringify(logData));
    console.log('日志已保存:', logData);
}

// 从本地存储加载日志
function loadLogs() {
    const savedLogs = localStorage.getItem('testLog');
    if (savedLogs) {
        logData = JSON.parse(savedLogs);
        console.log('日志已加载:', logData);
    }
}

// 导出日志为JSON文件
function exportLog() {
    try {
        // 检查logData是否存在
        if (!logData) {
            logData = {};
        }
        
        // 格式化日志数据，使其更直观
        const formattedLog = {
            '导出时间': new Date().toISOString(),
            '用户数量': Object.keys(logData).length,
            '分组统计': {
                'LLM先扬后抑(组1)': 0,
                'LLM先抑后扬(组2)': 0,
                '人类先扬后抑(组3)': 0,
                '人类先抑后扬(组4)': 0
            },
            '用户数据': {}
        };
        
        Object.keys(logData).forEach(userId => {
            const userData = logData[userId];
            
            // 更新分组统计
            if (userData.group_id) {
                const groupNames = {
                    1: 'LLM先扬后抑(组1)',
                    2: 'LLM先抑后扬(组2)',
                    3: '人类先扬后抑(组3)',
                    4: '人类先抑后扬(组4)'
                };
                if (groupNames[userData.group_id]) {
                    formattedLog['分组统计'][groupNames[userData.group_id]]++;
                }
            }
            
            formattedLog['用户数据'][`用户 ${userId}`] = {
                '用户ID': userData.id || '未知',
                '分组编号': userData.group_id || '未知',
                '分组名称': userData.group_name || '未知',
                '创建时间': userData.created_at || '未知',
                '基本信息': userData.register ? {
                    '昵称': userData.register.data.nickname || '未填写',
                    '性别': userData.register.data.gender || '未填写',
                    '兴趣': userData.register.data.interests || '未填写',
                    '个人简介': userData.register.data.bio || '未填写',
                    '注册时间': userData.register.timestamp || '未知'
                } : '未填写',
                '评价任务': userData.feedbacks && userData.feedbacks.length > 0 ? 
                    userData.feedbacks.map((feedback, index) => ({
                        '评价编号': index + 1,
                        '评价时间': feedback.timestamp || '未知',
                        '评价内容': feedback.data.content || '未填写',
                        '评分': feedback.data.score || '未评分',
                        '反馈内容': feedback.data.feedback || '未填写'
                    })) : '未完成',
                '创作内容': userData.creations && userData.creations.length > 0 ?
                    userData.creations.map((creation, index) => ({
                        '创作编号': index + 1,
                        '创作时间': creation.timestamp || '未知',
                        '标题': creation.data.title || '未填写',
                        '内容': creation.data.content || '未填写'
                    })) : '未完成',
                '收到的评价1': userData.received_feedback_1 ? {
                    '时间': userData.received_feedback_1.timestamp || '未知',
                    '评价者': userData.received_feedback_1.data.username || '未知',
                    '评分': userData.received_feedback_1.data.score || '未知',
                    '评价内容': userData.received_feedback_1.data.content || '未知'
                } : '未收到',
                '问卷1（匹配体验）': userData.survey1 ? {
                    '提交时间': userData.survey1.timestamp || '未知',
                    'Q1': userData.survey1.data.q1 || '未回答',
                    'Q2': userData.survey1.data.q2 || '未回答',
                    'Q3': userData.survey1.data.q3 || '未回答'
                } : '未填写',
                '对评价1的反馈': userData.feedback_response_1 ? {
                    '时间': userData.feedback_response_1.timestamp || '未知',
                    '选择': userData.feedback_response_1.data.response === 'approve' ? '认可' : '不认可'
                } : '未反馈',
                '收到的评价2': userData.received_feedback_2 ? {
                    '时间': userData.received_feedback_2.timestamp || '未知',
                    '评价者': userData.received_feedback_2.data.username || '未知',
                    '评分': userData.received_feedback_2.data.score || '未知',
                    '评价内容': userData.received_feedback_2.data.content || '未知'
                } : '未收到',
                '问卷2（创作反馈）': userData.survey2 ? {
                    '提交时间': userData.survey2.timestamp || '未知',
                    'Q1': userData.survey2.data.q1 || '未回答',
                    'Q2': userData.survey2.data.q2 || '未回答',
                    'Q3': userData.survey2.data.q3 || '未回答'
                } : '未填写',
                '对评价2的反馈': userData.feedback_response_2 ? {
                    '时间': userData.feedback_response_2.timestamp || '未知',
                    '选择': userData.feedback_response_2.data.response === 'approve' ? '认可' : '不认可'
                } : '未反馈'
            };
        });
        
        const dataStr = JSON.stringify(formattedLog, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'test_logs_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';
        
        // 确保链接被添加到DOM中
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        console.log('日志导出成功');
        customAlert('日志导出成功！');
    } catch (error) {
        console.error('导出日志失败:', error);
        customAlert('导出日志失败，请检查控制台错误信息');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 加载已保存的日志
    loadLogs();

    // 初始化 Firebase
    initFirebase();
    
    // 页面切换函数
    function showPage(pageId) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');
        
        // 根据页面类型控制底部导航栏显示/隐藏
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            // 创作页面、评价页面、问卷页面隐藏导航栏
            const hideNavPages = ['create-page', 'feedback-page', 'survey1-page', 'survey2-page', 
                                'publishing-page', 'publishing-success-page', 'wait-next-feedback-page',
                                'feedback-response-page', 'developer-page'];
            if (hideNavPages.includes(pageId)) {
                bottomNav.style.display = 'none';
            } else {
                bottomNav.style.display = 'flex';
            }
        }
    }
    
    // 底部导航栏切换
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            showPage(pageId);
            
            // 如果进入"我的"页面，加载用户信息
            if (pageId === 'profile-page' && currentUserId && logData[currentUserId]) {
                const userData = logData[currentUserId].register?.data || {};
                updateProfilePage(userData);
            }
            
            // 更新导航栏状态
            navBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // 开始任务按钮全局点击事件
    document.getElementById('start-task-btn').addEventListener('click', function() {
        if (!userState.creationCompleted) {
            // 任务1：还没创作，去创作页面
            showPage('create-page');
        } else if (userState.feedbackCount === 0 || (!userState.feedback1Received && !userState.survey1Completed)) {
            // 任务2：创作完成但还没评价，去评价页面
            document.getElementById('match-btn').click();
        } else if (userState.feedback1Received || userState.feedback2Received) {
            // 任务3：查看反馈
            if (userState.feedback1Received && !userState.survey1Completed) {
                showReceivedFeedbackPage(1);
            } else if (userState.feedback2Received) {
                showReceivedFeedbackPage(2);
            }
        }
    });
    
    // 全局事件委托 - 确保所有流程按钮都能正常工作
    document.addEventListener('click', function(e) {
        const target = e.target;
        
        // 发布按钮
        if (target.id === 'submit-creation' || target.closest('#submit-creation')) {
            e.preventDefault();
            const title = document.getElementById('create-title').value;
            const content = document.getElementById('create-content').value;
            
            console.log('发布按钮点击（委托）- title:', title, 'content:', content);
            
            if (title && content) {
                const creationData = {
                    title,
                    content
                };
                addLog('creation', creationData);
                uploadToFirebase(currentUserId, 'creation', creationData);

                userState.creationCompleted = true;
                userState.waitingForFeedback = true;

                document.getElementById('create-title').value = '';
                document.getElementById('create-content').value = '';

                updateTodayShares(39);
                showPage('home-page');
                updateHomePageState();
                
                setTimeout(function() {
                    userState.feedback1Received = true;
                    userState.waitingForFeedback = false;
                    updateHomePageState();
                    customAlert('匹配已完成！已收到第一条反馈，请查看。');
                }, 180000);
            } else {
                customAlert('请填写标题和内容');
            }
        }
        
        // 开始任务按钮
        if (target.id === 'start-task-btn' || target.closest('#start-task-btn')) {
            e.preventDefault();
            console.log('开始任务按钮点击（委托）');
            
            if (!userState.creationCompleted) {
                // 任务1：还没创作，去创作页面
                showPage('create-page');
            } else if (!userState.feedback1Received) {
                // 还没收到反馈，继续评价他人作品
                console.log('进入评价流程');
                
                const shares = [
                    { id: 1, content: '《那天风很大》\n\n风铃是被惊动的证人。\n倒影碎了又合上。\n你踩过松动的泥土，\n什么都没种下，就走了。\n我后来才想起，那是春天。\n但已经没有花了。', type: '诗歌', author: { nickname: '林深见鹿', gender: '女', tags: ['INFP', '诗歌', '摄影', '治愈系', '自然爱好者'], bio: '在文字里寻找灵魂的栖息地 | 偶尔拍照记录生活 | 相信每个瞬间都有意义' } },
                    { id: 2, content: '《练习：隐喻》\n\n我的心是倒影里的天空，\n风铃在肋骨间摇晃不安，\n每寸血管都流着解冻的泥土。\n春天在皮下组织秘密登陆，\n而我假装仍在冬眠。', type: '诗歌', author: { nickname: '雾散长安', gender: '男', tags: ['INTJ', '哲学', '艺术', '深夜诗人', '咖啡成瘾'], bio: '白天是程序员，夜晚是诗人 | 在代码与文字之间寻找平衡 | 相信逻辑与感性可以共存' } },
                    { id: 3, content: '《失眠纪要》\n\n数到第三千只羊时，风铃突然响了一下。\n没有风。那么是你来了吗。\n枕头像新翻的泥土，蓬松又潮湿。\n我翻了个身，把倒影压进床单的褶皱里。', type: '诗歌', author: { nickname: '星垂野阔', gender: '女', tags: ['INFJ', '心理学', '写作', '猫奴', '深夜emo选手'], bio: '心理学研究生 | 喜欢观察人类 | 写一些关于孤独与连接的文字 | 有两只猫' } },
                    { id: 4, content: '《明天也是普通的一天》\n\n主歌A\n闹钟响了三遍才睁眼\n刷牙的时候看着镜子里的脸\n昨天熬夜追的剧还没看完\n今天又要迟到了吧\n\n主歌B\n地铁里的人都不说话\n各自抱着手机像抱着盾牌\n有人戴着耳机闭着眼\n有人在打字，打了又删\n\n副歌\n没关系，没关系\n反正明天也是普通的一天\n没关系，没关系\n我们早就习惯了\n在这座城市里\n做一个安静的零件\n\n主歌C\n午饭吃的是楼下的便利店\n坐在靠窗的位置看了会儿天\n窗台上的绿萝又黄了一片\n想浇水，又忘了\n\n桥段\n也不是没有开心的事\n只是开心的事\n好像不值得拿出来说\n就像你，就像我\n\n副歌（重复）\n没关系，没关系\n反正明天也是普通的一天\n没关系，没关系\n我们早就习惯了\n在这座城市里\n做一个安静的零件\n\n结尾\n闹钟响了\n又是明天', type: '歌词', author: { nickname: '城市漫游者', gender: '男', tags: ['ENFP', '音乐制作', '街头摄影', '社畜诗人', 'City Pop爱好者'], bio: '广告文案策划 | 业余音乐人 | 在城市的缝隙里寻找灵感 | 相信平凡中自有诗意' } }
                ];
                
                const unevaluatedShares = shares.filter(share => !userState.evaluatedContentIds.includes(share.id));
                
                if (unevaluatedShares.length === 0) {
                    customAlert('暂无新内容，请稍后再试');
                    return;
                }
                
                showPage('matching-page');
                
                setTimeout(function() {
                    showFeedbackPage(unevaluatedShares[0]);
                }, 2000);
            } else if (userState.feedback1Received || userState.feedback2Received) {
                // 收到反馈，先查看评价再填问卷
                console.log('查看评价');
                if (userState.feedback1Received && !userState.survey1Completed) {
                    showReceivedFeedbackPage(1);
                } else if (userState.feedback2Received) {
                    showReceivedFeedbackPage(2);
                }
            }
        }
        
        // 提交评价按钮
        if (target.id === 'submit-feedback' || target.closest('#submit-feedback')) {
            e.preventDefault();
            console.log('提交评价按钮点击（委托）');
            
            const selectedShare = currentFeedbackShare;
            if (!selectedShare) return;
            
            const stars = document.querySelectorAll('.star.active');
            let selectedScore = 0;
            if (stars.length > 0) {
                selectedScore = parseFloat(stars[stars.length - 1].getAttribute('data-score'));
            }
            
            const feedbackData = {
                contentId: selectedShare.id,
                content: selectedShare.content,
                type: selectedShare.type,
                score: selectedScore > 0 ? selectedScore : '未评分',
                feedback: document.querySelector('textarea')?.value || ''
            };
            addLog('feedback', feedbackData);
            uploadToFirebase(currentUserId, 'feedback', feedbackData);
            
            if (!userState.evaluatedContentIds) {
                userState.evaluatedContentIds = [];
            }
            userState.evaluatedContentIds.push(selectedShare.id);
            userState.feedbackCount++;
            
            customAlert('评价成功！');
            showPage('home-page');
            updateHomePageState();
        }
        
        // 认可评价按钮
        if (target.id === 'approve-feedback' || target.closest('#approve-feedback')) {
            e.preventDefault();
            console.log('认可评价按钮点击（委托）');
            
            const feedbackNumber = userState.feedback1Received && !userState.survey1Completed ? 1 : 2;
            const responseData = { response: 'approve' };
            addLog('feedback_response_' + feedbackNumber, responseData);
            uploadToFirebase(currentUserId, 'feedback_response_' + feedbackNumber, responseData);
            
            if (feedbackNumber === 1) {
                showPage('survey1-page');
            } else {
                showPage('survey2-page');
            }
        }
        
        // 不认可评价按钮
        if (target.id === 'reject-feedback' || target.closest('#reject-feedback')) {
            e.preventDefault();
            console.log('不认可评价按钮点击（委托）');
            
            const feedbackNumber = userState.feedback1Received && !userState.survey1Completed ? 1 : 2;
            const responseData = { response: 'reject' };
            addLog('feedback_response_' + feedbackNumber, responseData);
            uploadToFirebase(currentUserId, 'feedback_response_' + feedbackNumber, responseData);
            
            if (feedbackNumber === 1) {
                showPage('survey1-page');
            } else {
                showPage('survey2-page');
            }
        }
        
        // 继续查看下一条评价按钮
        if (target.id === 'next-feedback-btn' || target.closest('#next-feedback-btn')) {
            e.preventDefault();
            console.log('继续查看下一条评价按钮点击（委托）');
            
            showPage('publishing-success-page');
            
            setTimeout(function() {
                userState.feedback2Received = true;
                showReceivedFeedbackPage(2);
            }, 2000);
        }
        
        // 问卷1表单提交
        if (target.closest('#survey1-form')) {
            e.preventDefault();
            console.log('问卷1表单提交（委托）');
            
            const q1 = document.querySelector('input[name="q1"]:checked')?.value || '未回答';
            const q2 = document.querySelector('input[name="q2"]:checked')?.value || '未回答';
            const q3 = document.querySelector('input[name="q3"]:checked')?.value || '未回答';
            const q4 = document.querySelector('input[name="q4"]:checked')?.value || '未回答';
            const q5 = document.querySelector('input[name="q5"]:checked')?.value || '未回答';
            const q6 = document.querySelector('input[name="q6"]:checked')?.value || '未回答';
            const q7 = document.querySelector('input[name="q7"]:checked')?.value || '未回答';
            const q8 = document.querySelector('input[name="q8"]:checked')?.value || '未回答';
            
            const emotion1 = document.querySelector('input[name="emotion1"]:checked')?.value || '未回答';
            const emotion2 = document.querySelector('input[name="emotion2"]:checked')?.value || '未回答';
            const emotion3 = document.querySelector('input[name="emotion3"]:checked')?.value || '未回答';
            const emotion4 = document.querySelector('input[name="emotion4"]:checked')?.value || '未回答';
            const emotion5 = document.querySelector('input[name="emotion5"]:checked')?.value || '未回答';
            const emotion6 = document.querySelector('input[name="emotion6"]:checked')?.value || '未回答';
            
            const survey1Data = {
                q1, q2, q3, q4, q5, q6, q7, q8,
                emotion1, emotion2, emotion3, emotion4, emotion5, emotion6
            };
            addLog('survey1', survey1Data);
            uploadToFirebase(currentUserId, 'survey1', survey1Data);
            
            userState.survey1Completed = true;
            customAlert('问卷已提交！');
            
            showPage('publishing-success-page');
            
            setTimeout(function() {
                userState.feedback2Received = true;
                showReceivedFeedbackPage(2);
            }, 2000);
        }
        
        // 问卷2表单提交
        if (target.closest('#survey2-form')) {
            e.preventDefault();
            console.log('问卷2表单提交（委托）');
            
            const q1 = document.querySelector('input[name="q1"]:checked')?.value || '未回答';
            const q2 = document.querySelector('input[name="q2"]:checked')?.value || '未回答';
            const q3 = document.querySelector('input[name="q3"]:checked')?.value || '未回答';
            const q4 = document.querySelector('input[name="q4"]:checked')?.value || '未回答';
            const q5 = document.querySelector('input[name="q5"]:checked')?.value || '未回答';
            const q6 = document.querySelector('input[name="q6"]:checked')?.value || '未回答';
            const q7 = document.querySelector('input[name="q7"]:checked')?.value || '未回答';
            const q8 = document.querySelector('input[name="q8"]:checked')?.value || '未回答';
            
            const emotion1 = document.querySelector('input[name="emotion1"]:checked')?.value || '未回答';
            const emotion2 = document.querySelector('input[name="emotion2"]:checked')?.value || '未回答';
            const emotion3 = document.querySelector('input[name="emotion3"]:checked')?.value || '未回答';
            const emotion4 = document.querySelector('input[name="emotion4"]:checked')?.value || '未回答';
            const emotion5 = document.querySelector('input[name="emotion5"]:checked')?.value || '未回答';
            const emotion6 = document.querySelector('input[name="emotion6"]:checked')?.value || '未回答';
            
            const survey2Data = {
                q1, q2, q3, q4, q5, q6, q7, q8,
                emotion1, emotion2, emotion3, emotion4, emotion5, emotion6
            };
            addLog('survey2', survey2Data);
            uploadToFirebase(currentUserId, 'survey2', survey2Data);
            
            userState.survey2Completed = true;
            customAlert('问卷已提交！');
            
            showPage('home-page');
            updateHomePageState();
        }
    });
    
    // 初始显示注册页面
    showPage('register-page');
    // 隐藏底部导航栏，直到注册完成
    document.querySelector('.bottom-nav').style.display = 'none';
    
    // 注册表单提交
    document.getElementById('register-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nickname = document.getElementById('nickname').value;
        const gender = document.getElementById('gender').value;
        const interests = document.getElementById('interests').value;
        const bio = document.getElementById('bio').value;
        
        if (nickname && gender) {
            // 记录注册信息
            const registerData = {
                nickname,
                gender,
                interests,
                bio
            };
            addLog('register', registerData);

            // 上传到 Firebase
            uploadToFirebase(currentUserId, 'register', registerData);
            
            // 更新"我的"页面显示用户信息
            updateProfilePage(registerData);
            
            // 重置用户状态
            userState = {
                feedbackCompleted: false,
                feedbackCount: 0,
                evaluatedContentIds: [],
                creationCompleted: false,
                feedback1Received: false,
                feedback2Received: false,
                survey1Completed: false,
                survey2Completed: false,
                waitingForFeedback: false
            };
            
            // 显示主页
            showPage('home-page');
            // 显示底部导航栏
            document.querySelector('.bottom-nav').style.display = 'flex';
            // 更新导航栏状态
            navBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('.nav-btn[data-page="home-page"]').classList.add('active');
            // 更新主页状态显示和步骤指引
            updateHomePageState();
        } else {
            customAlert('请填写昵称和性别');
        }
    });
    
    // 保存日志到本地存储
    function saveLog() {
        localStorage.setItem('testLog', JSON.stringify(logData));
        console.log('日志已保存:', logData);
    }
    
    // 匹配按钮点击事件
    document.getElementById('match-btn').addEventListener('click', function() {
        // 检查是否还有未评价的内容
        const shares = [
            { id: 1, content: '《那天风很大》\n\n风铃是被惊动的证人。\n倒影碎了又合上。\n你踩过松动的泥土，\n什么都没种下，就走了。\n我后来才想起，那是春天。\n但已经没有花了。', type: '诗歌', author: { nickname: '林深见鹿', gender: '女', tags: ['INFP', '诗歌', '摄影', '治愈系', '自然爱好者'], bio: '在文字里寻找灵魂的栖息地 | 偶尔拍照记录生活 | 相信每个瞬间都有意义' } },
            { id: 2, content: '《练习：隐喻》\n\n我的心是倒影里的天空，\n风铃在肋骨间摇晃不安，\n每寸血管都流着解冻的泥土。\n春天在皮下组织秘密登陆，\n而我假装仍在冬眠。', type: '诗歌', author: { nickname: '雾散长安', gender: '男', tags: ['INTJ', '哲学', '艺术', '深夜诗人', '咖啡成瘾'], bio: '白天是程序员，夜晚是诗人 | 在代码与文字之间寻找平衡 | 相信逻辑与感性可以共存' } },
            { id: 3, content: '《失眠纪要》\n\n数到第三千只羊时，风铃突然响了一下。\n没有风。那么是你来了吗。\n枕头像新翻的泥土，蓬松又潮湿。\n我翻了个身，把倒影压进床单的褶皱里。', type: '诗歌', author: { nickname: '星垂野阔', gender: '女', tags: ['INFJ', '心理学', '写作', '猫奴', '深夜emo选手'], bio: '心理学研究生 | 喜欢观察人类 | 写一些关于孤独与连接的文字 | 有两只猫' } },
            { id: 4, content: '《明天也是普通的一天》\n\n主歌A\n闹钟响了三遍才睁眼\n刷牙的时候看着镜子里的脸\n昨天熬夜追的剧还没看完\n今天又要迟到了吧\n\n主歌B\n地铁里的人都不说话\n各自抱着手机像抱着盾牌\n有人戴着耳机闭着眼\n有人在打字，打了又删\n\n副歌\n没关系，没关系\n反正明天也是普通的一天\n没关系，没关系\n我们早就习惯了\n在这座城市里\n做一个安静的零件\n\n主歌C\n午饭吃的是楼下的便利店\n坐在靠窗的位置看了会儿天\n窗台上的绿萝又黄了一片\n想浇水，又忘了\n\n桥段\n也不是没有开心的事\n只是开心的事\n好像不值得拿出来说\n就像你，就像我\n\n副歌（重复）\n没关系，没关系\n反正明天也是普通的一天\n没关系，没关系\n我们早就习惯了\n在这座城市里\n做一个安静的零件\n\n结尾\n闹钟响了\n又是明天', type: '歌词', author: { nickname: '城市漫游者', gender: '男', tags: ['ENFP', '音乐制作', '街头摄影', '社畜诗人', 'City Pop爱好者'], bio: '广告文案策划 | 业余音乐人 | 在城市的缝隙里寻找灵感 | 相信平凡中自有诗意' } }
        ];
        
        // 过滤未评价的内容，保持原有顺序
        const unevaluatedShares = shares.filter(share => !userState.evaluatedContentIds.includes(share.id));
        
        if (unevaluatedShares.length === 0) {
            customAlert('暂无新内容，请稍后再试');
            return;
        }
        
        showPage('matching-page');
        
        // 模拟匹配过程
        setTimeout(function() {
            // 按顺序选择第一个未评价的内容
            showFeedbackPage(unevaluatedShares[0]);
        }, 2000); // 2秒后显示反馈页面
    });
    

    // 显示反馈页面
    function showFeedbackPage(selectedShare) {
        // 保存当前评价内容供后续使用
        currentFeedbackShare = selectedShare || {
            id: 1,
            content: '《那天风很大》\n\n风铃是被惊动的证人。\n倒影碎了又合上。\n你踩过松动的泥土，\n什么都没种下，就走了。\n我后来才想起，那是春天。\n但已经没有花了。',
            type: '诗歌',
            author: {
                nickname: '林深见鹿',
                gender: '女',
                tags: ['INFP', '诗歌', '摄影', '治愈系', '自然爱好者'],
                bio: '在文字里寻找灵魂的栖息地 | 偶尔拍照记录生活 | 相信每个瞬间都有意义'
            }
        };
        
        showPage('feedback-page');
        
        const feedbackContainer = document.getElementById('feedback-container');
        feedbackContainer.innerHTML = '';
        
        const card = document.createElement('div');
        card.className = 'feedback-card';
        
        // 生成标签HTML
        const tagsHtml = currentFeedbackShare.author.tags.map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');
        
        let cardContent = `
            <!-- 作者信息 -->
            <div class="author-section">
                <div class="author-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="author-info">
                    <div class="author-nickname">${currentFeedbackShare.author.nickname}</div>
                    <div class="author-tags">${tagsHtml}</div>
                    <div class="author-bio">${currentFeedbackShare.author.bio}</div>
                </div>
            </div>
            
            <!-- 作品内容 -->
            <div class="work-section">
                <h3>${currentFeedbackShare.type}</h3>
                <div class="content">${currentFeedbackShare.content}</div>
            </div>
        `;
        
        cardContent += `
            <div class="form-group">
                <label>评分：</label>
                <div class="star-rating">
                    <div class="star-container">
                        <span class="star" data-score="1">★</span>
                        <span class="star" data-score="1.5">½</span>
                        <span class="star" data-score="2">★</span>
                        <span class="star" data-score="2.5">½</span>
                        <span class="star" data-score="3">★</span>
                        <span class="star" data-score="3.5">½</span>
                        <span class="star" data-score="4">★</span>
                        <span class="star" data-score="4.5">½</span>
                        <span class="star" data-score="5">★</span>
                    </div>
                    <div class="score-display">
                        <span id="selected-score">0</span> / 5
                    </div>
                </div>
            </div>
            <div class="form-group">
                <textarea placeholder="请输入您的反馈..."></textarea>
            </div>
        `;
        
        card.innerHTML = cardContent;
        feedbackContainer.appendChild(card);
        
        // 评分星星事件
        const stars = document.querySelectorAll('.star');
        const scoreDisplay = document.getElementById('selected-score');
        let selectedScore = 0;
        
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const score = parseFloat(this.getAttribute('data-score'));
                selectedScore = score;
                scoreDisplay.textContent = score;
                
                // 更新星星高亮
                stars.forEach(s => s.classList.remove('active'));
                stars.forEach((s, index) => {
                    const sScore = parseFloat(s.getAttribute('data-score'));
                    if (sScore <= score) {
                        s.classList.add('active');
                    }
                });
            });
        });
        
        // 提交反馈按钮
        document.getElementById('submit-feedback').addEventListener('click', function() {
            // 记录评价信息
            const feedbackData = {
                contentId: randomShare.id,
                content: randomShare.content,
                type: randomShare.type,
                score: selectedScore > 0 ? selectedScore : '未评分',
                feedback: document.querySelector('textarea')?.value || ''
            };
            addLog('feedback', feedbackData);

            // 上传到 Firebase
            uploadToFirebase(currentUserId, 'feedback', feedbackData);
            
            // 记录已评价的内容ID
            if (!userState.evaluatedContentIds) {
                userState.evaluatedContentIds = [];
            }
            userState.evaluatedContentIds.push(randomShare.id);
            
            // 更新评价次数
            userState.feedbackCount++;
            
            // 显示成功提示
            customAlert('评价成功！');
            // 返回主页
            showPage('home-page');
            updateHomePageState();
        });
    }
    
    // 显示收到的评价页面
    function showReceivedFeedbackPage(feedbackNumber) {
        showPage('feedback-response-page');
        
        // 根据分组和评价序号确定评价内容
        const groupId = logData[currentUserId]?.group_id || 1;
        const isFirstFeedback = feedbackNumber === 1;
        
        // 评价内容定义
        const coldFeedback = {
            score: 2.5,
            content: '2.5/5。\n\n写的是春天。意象挺常见的，没太跳出常规。逻辑上基本是顺的。但情感表达上，说实话，能感觉到很明显的用力，略显刻意，那种"想写出感觉"的意图暴露得太清楚，反而和春天该有的自然感有了距离。'
        };
        
        const warmFeedback = {
            score: 2.5,
            content: '2.5/5\n\n是关于春天的诗对吧？意象虽然都是大家熟悉的，但你依然能组织起来让整首诗的逻辑很顺畅。唯一有点可惜的是，在表达情感的时候可能稍微绷得紧了一些，让文字的自然感打了点折扣。不过我觉得能表达还是很棒的！稍微放松一点，下次春天的感觉一定更打动人~'
        };
        
        // 人类评价者列表
        const humanEvaluators = [
            { name: '用户a231gda1p', tags: [] },
            { name: '用户b572hfc9q', tags: [] },
            { name: '用户c394jkd2r', tags: [] },
            { name: '用户d816mne7s', tags: [] }
        ];
        
        // LLM评价者
        const llmEvaluator = { name: '该评价由大语言模型智能AI生成', tags: [] };
        
        let feedback, evaluator;
        
        // 根据组别确定评价顺序和评价者
        if (groupId === 1) {
            // LLM先扬后抑
            feedback = isFirstFeedback ? warmFeedback : coldFeedback;
            evaluator = llmEvaluator;
        } else if (groupId === 2) {
            // LLM先抑后扬
            feedback = isFirstFeedback ? coldFeedback : warmFeedback;
            evaluator = llmEvaluator;
        } else if (groupId === 3) {
            // 人类先扬后抑
            feedback = isFirstFeedback ? warmFeedback : coldFeedback;
            evaluator = humanEvaluators[Math.floor(Math.random() * humanEvaluators.length)];
        } else {
            // 人类先抑后扬
            feedback = isFirstFeedback ? coldFeedback : warmFeedback;
            evaluator = humanEvaluators[Math.floor(Math.random() * humanEvaluators.length)];
        }
        
        const feedbackData = {
            id: feedbackNumber,
            username: evaluator.name,
            tags: evaluator.tags,
            content: feedback.content,
            score: feedback.score,
            time: feedbackNumber === 1 ? '2分钟前' : '5分钟前',
            isAI: groupId === 1 || groupId === 2
        };
        
        const feedbackResponseContent = document.querySelector('.feedback-response-content');
        feedbackResponseContent.innerHTML = `
            <h2>评价内容</h2>
            <div class="feedback-card">
                <div class="evaluator-info-block">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 2em; color: white; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                            ${feedbackData.isAI ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>'}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.3em; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                            ${feedbackData.username} ${feedbackData.isAI ? '<span style="font-size: 0.6em; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 3px 10px; border-radius: 20px; vertical-align: middle;">AI</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="content">
                    <p>评分：${'★'.repeat(Math.floor(feedbackData.score))}${feedbackData.score % 1 === 0.5 ? '½' : ''}${'☆'.repeat(Math.floor(5 - feedbackData.score))} (${feedbackData.score}/5)</p>
                    <p style="white-space: pre-wrap;">${feedbackData.content}</p>
                </div>
            </div>
            <p style="margin-top: 30px;">您对收到的评价有什么看法？</p>
            <div class="feedback-response-buttons">
                <button id="approve-feedback" class="primary-btn">认可该评价</button>
                <button id="reject-feedback" class="secondary-btn">不认可该评价</button>
            </div>
        `;
        
        // 记录收到的评价
        addLog('received_feedback_' + feedbackNumber, feedbackData);

        // 上传到 Firebase
        uploadToFirebase(currentUserId, 'received_feedback_' + feedbackNumber, feedbackData);
        
        // 重新绑定认可/不认可按钮的事件监听器
        document.getElementById('approve-feedback').addEventListener('click', function() {
            // 记录反馈认可信息
            const responseData = { response: 'approve' };
            addLog('feedback_response_' + feedbackNumber, responseData);

            // 上传到 Firebase
            uploadToFirebase(currentUserId, 'feedback_response_' + feedbackNumber, responseData);
            
            // 根据评价序号决定下一步
            if (feedbackNumber === 1) {
                // 第一个评价后显示问卷1
                showPage('survey1-page');
            } else {
                // 第二个评价后显示问卷2
                showPage('survey2-page');
            }
        });
        
        document.getElementById('reject-feedback').addEventListener('click', function() {
            // 记录反馈不认可信息
            const responseData = { response: 'reject' };
            addLog('feedback_response_' + feedbackNumber, responseData);

            // 上传到 Firebase
            uploadToFirebase(currentUserId, 'feedback_response_' + feedbackNumber, responseData);
            
            // 根据评价序号决定下一步
            if (feedbackNumber === 1) {
                // 第一个评价后显示问卷1
                showPage('survey1-page');
            } else {
                // 第二个评价后显示问卷2
                showPage('survey2-page');
            }
        });
    }
    
    // 提交创作按钮
    document.getElementById('submit-creation').addEventListener('click', function() {
        const title = document.getElementById('create-title').value;
        const content = document.getElementById('create-content').value;
        
        console.log('发布按钮点击 - title:', title, 'content:', content);
        
        if (title && content) {
            // 记录创作信息
            const creationData = {
                title,
                content
            };
            addLog('creation', creationData);

            // 上传到 Firebase
            uploadToFirebase(currentUserId, 'creation', creationData);

            // 设置创作完成状态和等待状态
            userState.creationCompleted = true;
            userState.waitingForFeedback = true;

            // 清空表单
            document.getElementById('create-title').value = '';
            document.getElementById('create-content').value = '';

            // 更新今日分享数量
            updateTodayShares(39);

            // 返回主页显示状态
            showPage('home-page');
            updateHomePageState();
            
            // 3分钟后显示收到的评价1
            setTimeout(function() {
                userState.feedback1Received = true;
                userState.waitingForFeedback = false;
                updateHomePageState();
                customAlert('匹配已完成！已收到第一条反馈，请查看。');
            }, 180000); // 3分钟
        } else {
            customAlert('请填写标题和内容');
        }
    });
    

    
    // 问卷1提交
    document.getElementById('survey1-form').addEventListener('submit', function(e) {
        e.preventDefault();

        // 获取问卷答案（8个问题）
        const q1 = document.querySelector('input[name="q1"]:checked')?.value || '未回答';
        const q2 = document.querySelector('input[name="q2"]:checked')?.value || '未回答';
        const q3 = document.querySelector('input[name="q3"]:checked')?.value || '未回答';
        const q4 = document.querySelector('input[name="q4"]:checked')?.value || '未回答';
        const q5 = document.querySelector('input[name="q5"]:checked')?.value || '未回答';
        const q6 = document.querySelector('input[name="q6"]:checked')?.value || '未回答';
        const q7 = document.querySelector('input[name="q7"]:checked')?.value || '未回答';
        const q8 = document.querySelector('input[name="q8"]:checked')?.value || '未回答';

        // 获取情绪词评估（6个）
        const emotion1 = document.querySelector('input[name="emotion1"]:checked')?.value || '未回答';
        const emotion2 = document.querySelector('input[name="emotion2"]:checked')?.value || '未回答';
        const emotion3 = document.querySelector('input[name="emotion3"]:checked')?.value || '未回答';
        const emotion4 = document.querySelector('input[name="emotion4"]:checked')?.value || '未回答';
        const emotion5 = document.querySelector('input[name="emotion5"]:checked')?.value || '未回答';
        const emotion6 = document.querySelector('input[name="emotion6"]:checked')?.value || '未回答';

        // 记录问卷信息
        const survey1Data = {
            q1, q2, q3, q4, q5, q6, q7, q8,
            emotion1, emotion2, emotion3, emotion4, emotion5, emotion6
        };
        addLog('survey1', survey1Data);

        // 上传到 Firebase
        uploadToFirebase(currentUserId, 'survey1', survey1Data);

        // 设置问卷1完成状态
        userState.survey1Completed = true;

        // 显示成功提示
        customAlert('问卷已提交！');
        
        // 直接显示匹配提示，准备接收第二个评价
        showPage('publishing-success-page');
        
        // 2秒后自动显示收到的评价2（不再需要用户点击按钮）
        setTimeout(function() {
            userState.feedback2Received = true;
            showReceivedFeedbackPage(2);
        }, 2000);
    });

    // 继续查看下一条评价按钮
    document.getElementById('next-feedback-btn').addEventListener('click', function() {
        // 显示匹配提示，准备接收第二个评价
        showPage('publishing-success-page');

        // 2秒后显示收到的评价2
        setTimeout(function() {
            showReceivedFeedbackPage(2);
        }, 2000);
    });
    
    // 问卷2提交
    document.getElementById('survey2-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 获取问卷答案（8个问题）
        const q1 = document.querySelector('input[name="q1"]:checked')?.value || '未回答';
        const q2 = document.querySelector('input[name="q2"]:checked')?.value || '未回答';
        const q3 = document.querySelector('input[name="q3"]:checked')?.value || '未回答';
        const q4 = document.querySelector('input[name="q4"]:checked')?.value || '未回答';
        const q5 = document.querySelector('input[name="q5"]:checked')?.value || '未回答';
        const q6 = document.querySelector('input[name="q6"]:checked')?.value || '未回答';
        const q7 = document.querySelector('input[name="q7"]:checked')?.value || '未回答';
        const q8 = document.querySelector('input[name="q8"]:checked')?.value || '未回答';

        // 获取情绪词评估（6个）
        const emotion1 = document.querySelector('input[name="emotion1"]:checked')?.value || '未回答';
        const emotion2 = document.querySelector('input[name="emotion2"]:checked')?.value || '未回答';
        const emotion3 = document.querySelector('input[name="emotion3"]:checked')?.value || '未回答';
        const emotion4 = document.querySelector('input[name="emotion4"]:checked')?.value || '未回答';
        const emotion5 = document.querySelector('input[name="emotion5"]:checked')?.value || '未回答';
        const emotion6 = document.querySelector('input[name="emotion6"]:checked')?.value || '未回答';
        
        // 记录问卷信息
        const survey2Data = {
            q1, q2, q3, q4, q5, q6, q7, q8,
            emotion1, emotion2, emotion3, emotion4, emotion5, emotion6
        };
        addLog('survey2', survey2Data);

        // 上传到 Firebase
        uploadToFirebase(currentUserId, 'survey2', survey2Data);
        
        // 设置问卷2完成状态
        userState.survey2Completed = true;

        // 显示成功提示
        customAlert('问卷已提交！');
        // 返回主页
        showPage('home-page');
        // 更新导航栏状态
        navBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.nav-btn[data-page="home-page"]').classList.add('active');
        // 更新主页状态显示
        updateHomePageState();
    });
    
    // 创作工具按钮
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const title = this.getAttribute('title');
            customAlert(`${title}功能即将上线，敬请期待！`);
        });
    });
    
    // 创作提示窗口折叠/展开
    document.getElementById('task-hint-toggle').addEventListener('click', function() {
        const content = document.getElementById('task-hint-content');
        const icon = document.getElementById('toggle-icon');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.classList.remove('collapsed');
        } else {
            content.style.display = 'none';
            icon.classList.add('collapsed');
        }
    });
    
    // 开发者模式入口（在"我的"页面）
    document.getElementById('developer-btn').addEventListener('click', function() {
        const password = prompt('请输入开发者密码：');
        if (password === '528046') {
            showDeveloperPage();
        } else if (password !== null) {
            customAlert('密码错误！');
        }
    });
    
    // 显示开发者页面
    function showDeveloperPage() {
        showPage('developer-page');
        
        // 更新用户ID显示
        document.getElementById('developer-user-id').textContent = currentUserId || '未登录';
        
        // 更新分组显示
        const groupId = logData[currentUserId]?.group_id || '未分配';
        const groupNames = {
            1: '组1 - LLM先扬后抑',
            2: '组2 - LLM先抑后扬',
            3: '组3 - 人类先扬后抑',
            4: '组4 - 人类先抑后扬'
        };
        document.getElementById('developer-group').textContent = groupNames[groupId] || '未知分组';
        
        // 设置当前分组到下拉框
        document.getElementById('group-select').value = groupId || '1';
    }
    
    // 保存分组设置
    document.getElementById('save-group-btn').addEventListener('click', function() {
        const newGroup = parseInt(document.getElementById('group-select').value);
        
        if (currentUserId && logData[currentUserId]) {
            logData[currentUserId].group_id = newGroup;
            saveLog();
            
            // 更新显示
            const groupNames = {
                1: '组1 - LLM先扬后抑',
                2: '组2 - LLM先抑后扬',
                3: '组3 - 人类先扬后抑',
                4: '组4 - 人类先抑后扬'
            };
            document.getElementById('developer-group').textContent = groupNames[newGroup];

            customAlert('分组设置已保存！');
        } else {
            customAlert('请先登录！');
        }
    });
    
    // 保存并重新注册按钮
    document.getElementById('save-and-register-btn').addEventListener('click', function() {
        const newGroup = parseInt(document.getElementById('group-select').value);
        
        if (confirm(`确定要保存分组设置并重新注册吗？\n\n新分组：${['组1 - LLM先扬后抑', '组2 - LLM先抑后扬', '组3 - 人类先扬后抑', '组4 - 人类先抑后扬'][newGroup - 1]}`)) {
            // 保存分组设置
            if (currentUserId && logData[currentUserId]) {
                logData[currentUserId].group_id = newGroup;
                saveLog();
            }
            
            // 重新初始化用户状态
            userState = {
                feedbackCompleted: false,
                creationCompleted: false,
                feedback1Received: false,
                feedback2Received: false,
                survey1Completed: false,
                survey2Completed: false
            };
            
            // 返回注册页面
            showPage('register-page');
            document.querySelector('.bottom-nav').style.display = 'none';

            customAlert('分组设置已保存！请重新注册以应用新分组。');
        }
    });
    
    // 返回主页按钮
    document.getElementById('back-to-home-btn').addEventListener('click', function() {
        showPage('home-page');
        document.querySelector('.bottom-nav').style.display = 'flex';
    });
});

// 显示管理员访问面板
function showAdminAccess() {
    const panel = document.getElementById('admin-access-panel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

// 管理员导出日志
document.addEventListener('DOMContentLoaded', function() {
    const adminExportBtn = document.getElementById('admin-export-btn');
    if (adminExportBtn) {
        adminExportBtn.addEventListener('click', function() {
            try {
                exportLog();
            } catch (error) {
                console.error('导出日志失败:', error);
                customAlert('导出日志失败');
            }
        });
    }

    const adminSyncBtn = document.getElementById('admin-sync-btn');
    if (adminSyncBtn) {
        adminSyncBtn.addEventListener('click', function() {
            if (confirm('确定要同步所有数据到Firebase吗？')) {
                customAlert('Firebase同步功能需要配置。请联系开发者配置Firebase。');
            }
        });
    }
});

// 展开/收起创作完成提示
function toggleCreationTip() {
    const tip = document.getElementById('creation-complete-tip');
    const arrow = document.getElementById('tip-arrow');
    if (tip) {
        tip.classList.toggle('collapsed');
        if (arrow) {
            arrow.classList.toggle('collapsed');
        }
    }
}

// 显示创作完成提示
function showCreationCompleteTip() {
    const tip = document.getElementById('creation-complete-tip');
    if (tip) {
        tip.style.display = 'block';
    }
}

// 更新今日分享数量
function updateTodayShares(count) {
    const statNumber = document.querySelector('.stat-number');
    if (statNumber && statNumber.nextElementSibling && statNumber.nextElementSibling.textContent === '今日分享') {
        statNumber.textContent = count;
    }
}

// 在线人数波动更新
let baseOnlineCount = 128;

function updateOnlineCount() {
    const onlineUsersElement = document.getElementById('online-users');
    if (!onlineUsersElement) return;
    
    // 在基础人数上下波动（±15）
    const fluctuation = Math.floor(Math.random() * 31) - 15;
    const currentCount = baseOnlineCount + fluctuation;
    
    onlineUsersElement.textContent = `${currentCount}人在线`;
}

// 每隔3-8秒更新一次在线人数
function scheduleOnlineCountUpdate() {
    const delay = 3000 + Math.random() * 5000;
    setTimeout(function() {
        updateOnlineCount();
        scheduleOnlineCountUpdate();
    }, delay);
}

// 初始化在线人数更新
updateOnlineCount();
scheduleOnlineCountUpdate();