// 日志记录模块
let logData = [];

// 记录日志
export function addLog(type, data) {
    const logEntry = {
        type,
        timestamp: new Date().toISOString(),
        data
    };
    logData.push(logEntry);
    saveLog();
    return logEntry;
}

// 保存日志到本地存储
export function saveLog() {
    localStorage.setItem('testLog', JSON.stringify(logData));
    console.log('日志已保存:', logData);
}

// 获取所有日志
export function getLogs() {
    return logData;
}

// 从本地存储加载日志
export function loadLogs() {
    const savedLogs = localStorage.getItem('testLog');
    if (savedLogs) {
        logData = JSON.parse(savedLogs);
        console.log('日志已加载:', logData);
    }
}

// 清空日志
export function clearLogs() {
    logData = [];
    localStorage.removeItem('testLog');
    console.log('日志已清空');
}