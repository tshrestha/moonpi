const axios = require('axios')
const cheerio = require('cheerio')

const MOON_API_BASE_URI = 'https://moonboard.com'

const urls = {
    login: '/Account/Login',
    problems: '/Dashboard/GetBenchmarks',
    dashboard: '/Dashboard/Index',
}

async function getLoginPage() {
    return await axios.get(`${MOON_API_BASE_URI}${urls.login}`)
}

async function getAuthTokens(username, password) {
    try {
        const loginPage = await getLoginPage()

        const loginPageCookie = loginPage.headers['set-cookie'][0]
            .split(';')[0]
            .split('=')[1]

        const loginPageHtml = loginPage.data
        const loginPageDom = cheerio.load(loginPageHtml)

        const requestVerificationToken = loginPageDom(
            'input[name=__RequestVerificationToken]'
        ).val()

        const payload = new URLSearchParams()
        payload.append('Login.Username', username)
        payload.append('Login.Password', password)
        payload.append('__RequestVerificationToken', requestVerificationToken)

        const res = await axios({
            method: 'POST',
            baseURL: MOON_API_BASE_URI,
            url: urls.login,
            data: payload,
            headers: {
                Cookie: `__RequestVerificationToken=${loginPageCookie}`,
                'Content-Type':
                    'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })

        const tokens = { requestVerificationToken: loginPageCookie }
        res.headers['set-cookie'].forEach((cookie) => {
            const [name, value] = cookie.split('=')
            if (name === '_MoonBoard') {
                tokens.moonboard = value.split(';')[0]
            }
        })

        return tokens
    } catch (error) {
        console.log(error)
    }
}

async function getProblems(authTokens) {
    try {
        const params = new URLSearchParams()
        params.append('group', '')
        params.append('sort', '')
        params.append('filter', '')

        const res = await axios({
            method: 'POST',
            baseURL: MOON_API_BASE_URI,
            url: urls.problems,
            data: params,
            headers: {
                Accept: '*/*',
                Cookie: `__RequestVerificationToken=${authTokens.requestVerificationToken}; _MoonBoard=${authTokens.moonboard}`,
                'Content-Type':
                    'application/x-www-form-urlencoded; charset=UTF-8',
            },
        })
        return res.data
    } catch (error) {
        console.log(error)
    }
}

;(async () => {
    const [, , username, password] = process.argv
    const tokens = await getAuthTokens(`${username}`, `${password}`)
    const problems = await getProblems(tokens)
    console.log(problems)
})()
