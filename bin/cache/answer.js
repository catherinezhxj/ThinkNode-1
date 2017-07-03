// 加载模块
const fs = require('fs');
const path = require('path');

// 用户接口地址, 开启子域后只针对www域名生效
const $userPath = Think.option.user.path; // d:/user/
// 是否子域
const $offsprdomain = Think.option.offsprdomain;
// 文件地址
const $path = Think.option.path;
// 存储队列
const Answer = new Map;

const {tool} = Think;

// 根据地址获取相关js地址, 文件信息, 以及相关函数, 存储到Answer中
function initUserRoute(AnswerMap, userPath = $path) {
	// 检查子域是否生效
	if ($offsprdomain) {
		let ifPath = fs.existsSync(userPath);
		if (ifPath) {
			// 存在, 遍历, 每个子域目录
			let stats = fs.readdirSync(userPath);
			AnswerMap.set('child', []);
			stats.forEach((stat) => {
				// 创建子域
				let childMap = new Map;
				// 子域位置信息
				let fileName = path.join(userPath, stat);
				// 子域目录信息
				let statInfo = fs.statSync(fileName);
				
				if (statInfo.isDirectory()) {
					// 子域配置信息
					let optPath = path.join(fileName, 'option.json');
					let ifStatPath = fs.existsSync(optPath);
					let option = {};
					ifStatPath && (option = require(optPath));
					
					// 存储目录信息
					childMap.set('fileInfo', statInfo);
					childMap.set('fileUrl', fileName);
					childMap.set('option', option);
					childMap.set('name', stat);
					// 查询是否存在子域
					let {offsprDomain = false} = option;

					if (offsprDomain)
						initUserRoute(childMap, fileName);
					else {
						let childUserPath = path.join(fileName, (option.user || {}).path);
						childUserPath && initUserFilesRoute(childMap, childUserPath);
					}

					AnswerMap.get('child').push(childMap);
				};
			});
		} else {
			__ISMASTER && console.log(userPath.error);
		}
		return;
	} else {
		// 自动存储内容
		let wwwMap = new Map
		let statInfo = fs.statSync($userPath);
		wwwMap.set('fileInfo', statInfo);
		wwwMap.set('fileUrl', $userPath);
		wwwMap.set('name', 'www');
		wwwMap.set('option', Think.option);
		AnswerMap.set('child', [wwwMap]);
		initUserFilesRoute(wwwMap, $userPath);
	}
		
};

// 取子域下内容
function initUserFilesRoute(AnswerMap, userPath) {
	if(!fs.existsSync(userPath)) return null;
    let stats = fs.readdirSync(userPath);
	AnswerMap.set('nodeList', []);
	stats.forEach((stat) => {
		let filePath = path.join(userPath, stat);
		let fileInfo = fs.statSync(filePath);
		if (fileInfo.isFile()) {
			let nodeInfo = new Map;
			nodeInfo.set('filePath', filePath);
			nodeInfo.set('fileInfo', fileInfo);
			nodeInfo.set('nodeList', []);
			// 定义域缓存
			Think.$$NODE_CACHE_MAP = nodeInfo;
			
			try {
				require(filePath.replace(/\.js$/, ''));
				AnswerMap.get('nodeList').push(nodeInfo);
				__ISMASTER && console.log(filePath.input);
			} catch (error) {
				__ISMASTER && console.log(filePath.error), console.log(error);
			};
			
			// 结束域缓存
			delete Think.$$NODE_CACHE_MAP;
		} else if (fileInfo.isDirectory()) {
			// 文件夹
			initUserFilesRoute(AnswerMap, filePath)
		}
    });
}

/**
 * 入口函数
 * @param {string | object} url 接口地址
 * @param {string} type 		请求类型
 * @param {function} callback 	回调函数
 * @param {string} ContentType 	返回的ContentType值
 * @param {string} priority  	接口优先级
 */
let main = (url = {}, ContentType, callback) => {
	answerOption = {};
	typeof url === 'string' && (answerOption.url = url);
	typeof url === 'object' && (answerOption = url);
	typeof callback === 'function' && (answerOption.callback = callback);
	ContentType && (answerOption.ContentType = ContentType);
	let _url = answerOption.url;

	if (!_url && !Think.$$NODE_CACHE_MAP) return null;
	Think.$$NODE_CACHE_MAP.get('nodeList').push(answerOption);
	return _url;
};

main.proto = () => Answer;

// 初始化数据
Think.answer = main;
 
__ISMASTER && console.log(ThinkInfo('loadAnswer').green);
initUserRoute(Answer, $path);

// 获取数据
Think.getAnswer = (host) => {
	if (typeof host !== 'string') return null;
	if (/^\d{1,4}\.\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(host)) host = 
	let hostArr = $offsprdomain ? host.split('.') : ['www', '', ''];
	let rtnanswer = Answer;
	let seek = false;
	for (let i = hostArr.length - 3; i >= 0; i--) {
		rtnanswerArr = rtnanswer.get('child') || [];
		for (let j = rtnanswerArr.length - 1; j >= 0; j --) {
			let name = rtnanswerArr[j].get('name');
			if (name === hostArr[i]) {
				rtnanswer = rtnanswerArr[j];
				seek = true;
				break;
			}
		}
		if (!rtnanswer) return null;	
	}
	return (seek ? rtnanswer : null);
}