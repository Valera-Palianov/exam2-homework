/**
 * Для выполнения задания нужно установить Node JS (делается быстро и просто)
 * 
 * 
 * Дан список городов. Код для их получения в переменную написан. Вам нужно написать программу, которая будет выполняться следующим образом:
 * node ./cities.js "all where %number%>5" - выведет все города из списка с полем number у объектов городов которые соответствуют условию (вместо number могут быть region и city)
 * 
 * первое слово указывает максимальное количиство или позицию (Для first и second выводится одна запись) - all - все, first - первый, last - последний, цифра - количество, например
 * node ./cities.js "3 where %number%>5" - выведет в консоль 3 записи
 * node ./cities.js "first where %number%>5" - выведет в консоль первую запись
 * 
 * если слова where нет, например:
 * node ./cities.js "all"
 * то вывод работает без фильтрации, в примере выше выведутся в консоль все города.
 * Для удобства разбора (парсинга) строки с запросом рекомендую использовать regex
 * если задан неверный запрос (в примере ниже пропущено слово where но присутствует условие) выводится ошибка: wrong query
 * node ./cities.js "all %number%>5"
 * 
 * Операции для запроса могут быть: больше (>), меньше (<), совпадает (=)
 * 
 * ОТВЕТ ВЫВОДИТЬ В КОНСОЛЬ И ПИСАТЬ В ФАЙЛ OUTPUT.JSON (каждый раз перезаписывая)
 */

const fs = require("fs")
const {log, warn, error} = console

const OUTPUT_FILE = "./output.json"

//Получаем аргументы
const filePath = process.argv[3] ? process.argv[3] : "./cities.json"
const query = process.argv[2] ? process.argv[2] : 'all'

function readFile(file, encoding = "utf8") {
	return new Promise((res, rej) => {
		fs.readFile(file, encoding, (err, data) => {
			if(!err) res(data)
			rej(err)
		})
	})
}

function writeFile(file, data) {
	return new Promise((res, rej) => {
		fs.writeFile(file, JSON.stringify(data), (err) => {
			if(!err) res(true)
			rej(err)
		})
	})
}

async function readAndParse(file, encoding = "utf8") {
	try {
		const toJson = await readFile(file, encoding)
		return JSON.parse(toJson)
	} catch(err) {
		warn('Something very wrong with this file, try again')
		throw err
	}
}

function parseQuery(query) {
	let result = {}

	const correctCount = ['all', 'first', 'last']

	const args = query.split(' ')
	const count = args[0]

	if(correctCount.includes(count)) {
		result.count = count
	} else {
		const numberCount = parseInt(count, 10)
		if(!isNaN(numberCount)) {
			result.count = numberCount
		} else {
			log("Query is incorrect! Count of entrys should be 'all', 'first', 'last' or number")
			return false
		}
	}

	if(args[1]) result = parseCondition(args[1], result)

	return result
}

function parseCondition(condition, base = {}) {
	const result = base

	const correctKeys = ['region', 'city', 'number']
	const operatorIndex = condition.search(/[<, >, =]/)

	if(operatorIndex !== -1) {
		const operator = condition[operatorIndex]
		result.operator = operator

		const keyAndValue = condition.split(operator)
		const key = keyAndValue[0].slice(1, -1)

		if(correctKeys.includes(key)) {
			result.key = key

			if(keyAndValue[1]) {
				const value = keyAndValue[1]
				
				if(key !== 'number') {
					result.value = value
				} else {
					if(!isNaN(parseInt(value))) {
						result.value = parseInt(value)
					} else {
						log("Query is incorrect! Search value should be number")
						return false		
					}
				}
			} else {
				log("Query is incorrect! Search value is empty")
				return false	
			}
		} else {
			log("Query is incorrect! Search key should be region, city or number")
			return false
		}
	} else {
		log("Query is incorrect! Operator should be <, > or =")
		return false
	}

	return result
}

function formatCity(city) {
	return `${city.number}\t${city.city} | ${city.region}`
}

function compare(operator, a, b) {
	result = false;
	switch(operator) {
		case '=':
			if(a === b) result = true
			break;
		case '>':
			if(a > b) result = true
			break;
		case '<':
			if(a < b) result = true
			break;
	}
	return result
}

readAndParse(filePath)
	.then((cities) => {
		//Обрабатываем запрос и проверяем, корректен ли он. Если да, передаем массив и запрос дальше
		const parsedQuery = parseQuery(query)
		if (parsedQuery !== false) {
			return {
				list: cities,
				query: parsedQuery
			}
		} else {
			process.exit(-1)
		}
	})
	.then((data) => {
		//Создаем новый массив согластно условиям поиска. Если они есть. Если нет, передаем массив, его длинну и запрос дальше. 
		const {list, query} = data

		const listLength = list.length
		let searchResult = list
		let searchResultLength = listLength

		if(query.key) {
			searchResult = []

			for(item of list) {
				if(compare(query.operator, item[query.key], query.value)) {
					searchResult.push(item)
				}
			}
			searchResultLength = searchResult.length
		}

		return {
			list: searchResult,
			length: searchResultLength,
			query: query
		}
	})
	.then((data) => {
		//Выводим из результатов поиска только нужное кол-во записей
		const {list, length, query} = data

		let finalList = []
		let listCount

		if(list !== 0) {
			if(query.count === 'first' || query.count === 'last') {
				if(query.count === 'first') finalList.push(list[0])
				if(query.count === 'last') finalList.push(list[list.length-1])
				listCount = 1
			} else {
				if(query.count === 'all') {
					listCount = length
					finalList = list				
				} else {
					listCount = query.count > length ? length : query.count

					for(let i = 0; i < listCount; i++) {
						finalList.push(list[i])
					}
				}

			}
		} else {
			log('Sorry, the search has not given any results')
			process.exit(-1)
		}

		return {
			list: finalList,
			count: listCount	
		}
	})
	.then((data) => {
		//Выводим в консоль
		const {list, count} = data
		log()
		log('--------------------------')
		for(let city of list) {
			log(formatCity(city))
		}
		log('--------------------------')
		log('Total: '+count)
		log()

		return list
	})
	.then((array) => {
		//Записываем в файл
		writeFile(OUTPUT_FILE, array)
	})