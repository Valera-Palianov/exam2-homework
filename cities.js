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



 /*

Более новая версия кода, записанная через классы, находится в файле parser.js. 

 */

const fs = require("fs")
const {log, warn, error} = console

//Класс Parser получает ссылку на входной файл, на выходной файл и запрос
//После вызова асинхронного метода parse() он читает входной файл, переводит его в JSON формат, фильтрует согластно запросу и возвращает результат обратно
//А так же записывает результат в указанный файл
class Parser {
	constructor(input = './input.json', output = './output.json', query = 'all') {
		this.rawQuery = query
		this.inputPath = input
		this.outputPath = output
	}

	async parse() {

		//Пытаемся считать файл и преобразовать его данные в JSON. Если метод вернул ошибку, останавливаем функцию и возвращаем текст ошибки
		const readFileResult = await this.readFile(this.inputPath)
		if(readFileResult.error) return readFileResult.error
		this.rawData = readFileResult.data

		//Пытаемся обработать запрос. При любых ошибках, опять же, функция останавливается и вовзращает текст ошибки	
		const parseQueryResult = this.parseQuery(this.rawQuery)
		if(parseQueryResult.error) return parseQueryResult.error
		this.query = parseQueryResult.query

		//Если запрос содержит фильтр, то фильтруем данные в отдельном методе
		if(this.query.filter) {
			this.data = this.filter(this.rawData, this.query.filter)
			if(this.data.length == 0) return "Search results are empty"
		} else {
			this.data = this.rawData
		}

		//Отбрасываем от фильтрованных данных все лишнее, согласно первой части запроса
		if(this.query.count !== 'all') {
			if(this.query.count === 'first' || this.query.count === 'last') {
				if(this.query.count === 'first') this.data = [this.data[0]]
				if(this.query.count === 'last') this.data = [this.data[this.data.length-1]]
			} else {
				this.data = this.data.slice(0, this.query.count)
			}
		}

		//Начинаем запись в файл. Не дожидаемся его завершения и сразу воззвращаем массив с данными.
		this.writeFile(this.outputPath, this.data)

		return this.data
	}

	async readFile(file, encoding = 'utf8') {

		let data = []
		let readError = false

		const readFilePromise = new Promise((res, rej) => {
			fs.readFile(file, encoding, (err, data) => {
				if(!err) res(data)
				rej(err)
			})
		})

		try {
			data = await readFilePromise

			try {
				data = JSON.parse(data)
			} catch(err) {
				readError = "This is not JSON file"
			}	

		} catch(err) {
			readError = "Could not process file"
		}	

		return {
			error: readError,
			data: data
		}
	}

	async writeFile(file, data) {
		return new Promise((res, rej) => {
			fs.writeFile(file, JSON.stringify(data), (err) => {
				if(!err) res(true)
				rej(err)
			})
		})
	}

	parseQuery(query) {
		const correctCount = ['all', 'first', 'last']

		let count
		let filter = false
		let error = false

		const args = query.split(' ')
		count = args[0]

		if(!correctCount.includes(count)) {
			count = parseInt(count, 10)
			if(isNaN(count)) {
				error = "Query is incorrect! Count of entrys should be 'all', 'first', 'last' or number"
			}
		}

		if(args[1]) {

			if(args[1] == 'where') {
				if(args[2]) {
					let rawFilter = args[2]
					filter = {}

					const operatorIndex = rawFilter.search(/[<, >, =]/)
					if(operatorIndex !== -1) {
						filter.operator = rawFilter[operatorIndex]

						const keyAndValue = rawFilter.split(filter.operator)

						if(keyAndValue[0]) {
							const key = keyAndValue[0]
							if(/^%[a-z]+%$/i.test(key)) {
								filter.key = key.slice(1, -1)

								if(keyAndValue[1]) {
									filter.value = keyAndValue[1]
								} else {
									error = "Query is incorrect! Search value is empty"
								}
							} else {
								error = "Query is incorrect! The key must consist of A-Z letters and be framed by a % sign"		
							}
						} else {
							error = "Query is incorrect! Search key cannot be empty!"	
						}
					} else {
						error = "Query is incorrect! Operator should be <, > or ="
					}
				} else {
					error = "Query is incorrect! The search query cannot be empty, if 'where' is use"
				}
			} else {
				error = "Query is incorrect! The search query must be after the word 'where'"
			}
		}

		return {
			error: error,
			query: {
				count: count,
				filter: filter
			}
		}
	}

	filter(data, filter) {
		const result = []

		function compare(operator, a, b) {
			let result = false;
			switch(operator) {
				case '=':
					if(a == b) result = true
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

		for(let item of data) {
			if(compare(filter.operator, item[filter.key], filter.value)) {
				result.push(item)
			}
		}

		return result
	}
}

const query = process.argv[2] ? process.argv[2] : 'all'
const inputFile = process.argv[3] ? process.argv[3] : "./cities.json"
const outputFile = process.argv[4] ? process.argv[4] : "./output.json"

const cities = new Parser(inputFile, outputFile, query)

cities.parse()
	.then(result => {
		if(Array.isArray(result)) {
			log()
			log('--------------------------')
			for(let city of result) {
				log( `${city.number}\t${city.city} | ${city.region}` )
			}
			log('--------------------------')
			log('Total: '+result.length)
			log()
		} else {
			log(result)
		}
	})