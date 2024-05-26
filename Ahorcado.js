var game = new Object()
var existsGame = false;
var dbName = "hangman.db"
Array.prototype.includes = function (n) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] == n) return true
    }
    return false
}

function onHelp(userobj) {
    print(userobj, "#helpahorcado | Comandos juego del ahorcado")
}

function onLoad() {
    if (initDatabaseQuery())
        print("\x0302Juego del Ahorcado by nokia - \x06v1.3.1")
    else
        print("\x0304\x06Error al cargar script Juego del Ahorcado v1.3.1")
}

function onPart(userobj) {
    if (!existsGame) return
    if (!(userobj.id in game.players)) return
    delete game.players[userobj.id]
    var numPlayers = Object.keys(game.players).length
    log(null, "\x0304" + userobj.name + " ha abandonado la partida, " + numPlayers + " jugador(es)")
    if (numPlayers < 2) {
        log(null, "\x0304Se termina la partida por falta de jugadores")
        endGame()
    }
}

function onCommand(userobj, cmd, target, args) {
    switch (true) {
        case cmd.indexOf("helpahorcado") == 0:
            help(userobj)
            break
        case cmd.indexOf("nuevojuego") == 0:
            if (existsGame) {
                log(null, "Ya existe una partida creada por " + user(game.owner).name)
                return
            }
            initGame()
            game.owner = userobj.id
            log(null, "Nueva partida creada por " + userobj.name)
            existsGame = true;
            break
        case cmd.indexOf("palabrajuego") == 0:
            setWordGame(userobj, cmd)
            break
        case cmd.indexOf("aleatoriojuego") == 0:
            loadRandomWord(userobj)
            break
        case cmd.indexOf("entrarjuego") == 0:
            addPlayer(userobj)
            break
        case cmd.indexOf("empezarjuego") == 0:
            startGame(userobj)
            break
        case cmd.indexOf("terminarjuego") == 0:
            if (!existsGame) {
                log(null, "No se ha creado una partida")
                return
            }
            if (userobj.id != game.owner) {
                log(null, "\x0304Solo el anfitrión de la partida puede terminarla")
                return
            }
            endGame()
            return
        case cmd.indexOf("historialjuego") == 0:
            showHistorysQuery(userobj)
            break
    }
}

function onTextAfter(userobj, txt) {
    if (!existsGame) return
    if (!game.isStarted) return
    var playersArray = Object.keys(game.players)
    var playerSelected = playersArray[game.currentPositon]
    var numPlayers = playersArray.length
    var text = txt.replace(/\x06|\x09|\x07|\x03[0-9]{2}|\x05[0-9]{2}/g, "");
    text = text.toLowerCase()
    if (text.indexOf("?") == 0 || game.wordCompleted) {
        if (!playersArray.includes(userobj.id)) {
            log(userobj, userobj.name + " no estás jugando")
            return
        }
        var tryText = ""
        if (text.indexOf("?") == 0)
            tryText = text.split("?")[1]
        else
            tryText = text
        tryWord(userobj, tryText)
        return
    }
    if (playerSelected == userobj.id) {
        if (text.length != 1) {
            log(null, "\x06" + userobj.name + "\x06 debes decir solo una letra")
            return
        }
        if (!game.validChars.includes(text)) {
            log(null, "\x06" + userobj.name + "\x06 letra no valida")
            return
        }
        game.currentPositon = game.currentPositon + 1
        if (game.currentPositon >= numPlayers)
            game.currentPositon = 0
        if (!game.usedChars.includes(text)) {
            game.usedChars.push(text)
            validateChar(text, userobj)
        } else
            log(null, "\x06" + userobj.name + " \x0304\x06ya se usó la letra \x06" + text)
        playGame()
    }
}

function loadRandomWord(userobj) {
    if (!existsGame) {
        log(userobj, "No se ha creado una partida")
        return
    }
    if (game.owner != userobj.id) {
        log("Solo el anfitrión de la partida puede configurar la palabra")
        return
    }
    if (game.isStarted) {
        log(userobj, "No se puede cambiar la palabra una vez que se inició la partida")
        return
    }
    log(null, "Cargando palabra aleatoria")
    if (!File.exists("words.txt")) {
        log(null, "No se encontró el archivo words.txt")
        return
    }
    var words = File.load("words.txt").split("\n")
    var selectedWord = words[Math.floor(Math.random() * words.length)];
    if (!selectedWord) {
        log(null, "No se encontró una palabra aleatoria, intente de nuevo")
        return
    }
    game.word = selectedWord
    game.ownerCanPlay = true
    log(null, "Palabra aleatoria cargada")
}

function initGame() {
    game.isStarted = false
    game.players = new Object()
    game.historyPlayers = new Object()
    game.points = new Object()
    game.currentPositon = 0
    game.usedChars = new Array()
    game.validChars = new Array("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "ñ", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z");
    game.word = ""
    game.winner = null
    game.owner = null
    game.errors = new Object()
    game.ownerCanPlay = false
    game.wordCompleted = false
}

function setWordGame(userobj, cmd) {
    if (!existsGame) {
        log(userobj, "No se ha creado una partida")
        return
    }
    if (game.owner != userobj.id) {
        log("Solo el anfitrión de la partida puede configurar la palabra")
        return
    }
    if (game.isStarted) {
        log(userobj, "No se puede cambiar la palabra una vez que se inició la partida")
        return
    }
    var text = cmd.replace(/\x06|\x09|\x07|\x03[0-9]{2}|\x05[0-9]{2}/g, "");
    var word = text.split(" ")[1]
    if (!word || word == "") {
        log(userobj, "Palabra inválida")
        return
    }
    if (word.length < 5) {
        log(userobj, "Palabra inválida, debe tener mínimo 5 letras")
        return
    }
    log(userobj, "\x0314Se configuró la palabra " + word)
    game.word = word
    game.ownerCanPlay = false
}

function tryWord(userobj, word) {
    if (!existsGame) {
        log(userobj, "No se ha creado una partida")
        return
    }
    if (!game.isStarted) {
        log(userobj, "No se iniciado la partida")
        return
    }
    if (!word || word == "") {
        log(userobj, "Palabra inválida")
        return
    }
    if (word == game.word) {
        game.points[userobj.id] = game.points[userobj.id] + 5
        log(null, "(H) \x0310\x06" + userobj.name + " \x06\x0302adivinó la palabra (H), la palabra era \x06\x0304" + word)
        game.winner = userobj.id
        endGame()
        return
    } else {
        log(null, userobj.name + " buen intento, pero \x06\x0304" + word + "\x06\x0302 no es la palabra")
        if (game.wordCompleted) {
            game.currentPositon = game.currentPositon + 1
            var playersArray = Object.keys(game.players)
            var numPlayers = playersArray.length
            if (game.currentPositon >= numPlayers)
                game.currentPositon = 0
            playGame()
        }
    }
}

function addPlayer(userobj) {
    if (!existsGame) {
        log(userobj, "No se ha creado una partida para unirse")
        return
    }
    if (game.isStarted) {
        log(userobj, "La partida ya ha empezado, no puede unirse")
        return
    }
    if (userobj.id == game.owner && !game.ownerCanPlay) {
        log(userobj, "El anfitrión de la partida no puede jugar cuando la palabra no se ha configurado aleatoriamente")
        return
    }
    if (!!game.players[userobj.id]) {
        log(userobj, "Ya te has unido a la partida")
        return
    }
    userobj.isPlaying = true
    game.players[userobj.id] = userobj
    game.historyPlayers[userobj.id] = userobj
    game.points[userobj.id] = 0
    game.errors[userobj.id] = 0
    var numPlayers = Object.keys(game.players).length
    log(null, userobj.name + " se ha unido a la partida, " + numPlayers + " jugador(es) en total")
}

function startGame(userobj) {
    if (!existsGame) {
        log(userobj, "No se ha creado una partida para iniciar")
        return
    }
    if (game.isStarted) {
        log(userobj, "La partida ya ha empezado")
        return
    }
    if (game.owner != userobj.id) {
        log(userobj, "Solo el anfitrión de la partida inciarla")
        return
    }
    if (!game.word) {
        log(userobj, "No se puede iniciar la partida, no ha definido la palabra")
        return
    }
    var playersArray = Object.keys(game.players)
    var numPlayers = playersArray.length
    if (numPlayers < 2) {
        log(null, "No se puede iniciar la partida, debe haber mínimo dos jugadores")
        return
    }
    game.isStarted = true
    log(null, "Juego del Ahorcado | La partida ha empezado")
    playGame()
}

function playGame() {
    var playersArray = Object.keys(game.players)
    var playerSelected = playersArray[game.currentPositon]
    var currentWord = showWord()
    if (currentWord == game.word) {
        game.wordCompleted = true
        log(null, "\x0310\x06" + game.players[playerSelected].name + "\x06\x0302 no quedan más letras, intenta adivinar la palabra")
    } else {
        log(null, "\x0310\x06" + game.players[playerSelected].name + "\x06\x0302 es tu turno, arroja una letra")
    }
}

function showPoints() {
    var playersArray = Object.keys(game.historyPlayers)
    log(null, "Puntajes:")
    var maxPoints = 0;
    var winnerId = null;
    for (var i = 0; i < playersArray.length; i++) {
        var player = game.historyPlayers[playersArray[i]]
        if (game.points[player.id] > maxPoints) {
            maxPoints = game.points[player.id]
            winnerId = player.id
        }
        var points = getPoints(game.points[player.id])
        print("\x0302- " + player.name + ": " + points)
    }
    var winnerPoints = getPoints(maxPoints)
    if (winnerId == null)
        log(null, "Nadie ganó la partida")
    else
        log(null, "Ganador de la partida: (H)(H)(H) \x06" + game.historyPlayers[winnerId].name + " (H)(H)(H), \x06Puntaje final: " + winnerPoints)
}

function getPoints(points) {
    var starIcon = "(*)"
    var string = ""
    for (var j = 0; j < points; j++)
        string = string + starIcon
    return string
}

function showWord() {
    var chars = game.word.split("")
    var string = ""
    var currentWord = ""
    for (var i = 0; i < chars.length; i++) {
        if (game.usedChars.includes(chars[i])) {
            currentWord = currentWord + chars[i]
            string = string + " " + chars[i] + " "
        }
        else
            string = string + " __ "
    }
    if (string != "")
        log(null, "\x0301" + string)
    return currentWord
}

function validateChar(text, userobj) {
    var chars = game.word.split("")
    if (chars.includes(text)) {
        game.points[userobj.id] = game.points[userobj.id] + 1
        var points = getPoints(game.points[userobj.id])
        log(null, "\x0303Correcto " + userobj.name + ", Puntaje: " + points)
    } else {
        game.errors[userobj.id] = game.errors[userobj.id] + 1
        log(null, "\x0304Incorrecto " + userobj.name + ", \x06" + game.errors[userobj.id] + " \x06error(es) de \x066")
        var scribbleName = "step" + game.errors[userobj.id] + ".jpg"
        var scribble = new Scribble().load(scribbleName)
        Users.local(function (user) {
            user.scribble("", scribble)
        })
        if (game.errors[userobj.id] >= 6) {
            log(null, ":'(\x0304\x06 " + userobj.name + " \x06estás ahorcado :'(")
            delete game.players[userobj.id]
            var numPlayers = Object.keys(game.players).length
            game.currentPositon = game.currentPositon - 1
            if (game.currentPositon < 0)
                game.currentPositon = numPlayers - 1
            else if (game.currentPositon >= numPlayers)
                game.currentPositon = 0
            if (numPlayers == 0) {
                log(null, "\x0301Fin del juego, nadie adivinó la palabra, la palabra era \x06" + game.word)
                endGame()
                return
            }
        }
    }
}

function endGame() {
    existsGame = false
    showPoints()
    updateHistorys()
    initGame()
    log(null, "Partida terminada")
}

function updateUserQuery(user, player) {
    var queryString = "UPDATE games SET total_points = {0}, won_games = {1} WHERE userid = {2}"
    var points = parseInt(user.total_points) + parseInt(game.points[player.id])
    var wonGames = parseInt(user.won_games)
    if (game.winner == player.id)
        wonGames = parseInt(user.won_games) + 1
    var query = new Query(queryString, points, wonGames, player.guid)
    var sql = new Sql()
    sql.open(dbName)
    if (sql.connected) {
        sql.query(query)
        sql.close()
    } else {
        log(null, "\x0304\x06Error al conectar con la base de datos:\x06" + sql.lastError)
    }
}

function insertUserQuery(user) {
    var queryString = "INSERT INTO games (userid, user, total_points, won_games) VALUES ({0}, {1}, {2}, {3})"
    var wonGames = 0
    if (game.winner == user.id)
        wonGames = 1
    var query = new Query(queryString, user.guid, user.name, game.points[user.id], wonGames)
    var sql = new Sql()
    sql.open(dbName)
    if (sql.connected) {
        sql.query(query)
        sql.close()
    } else {
        log(null, "\x0304\x06Error al conectar con la base de datos:\x06" + sql.lastError)
    }
}

function updateHistorys() {
    log(null, "Actualizando historial de partidas")
    var playersArray = Object.keys(game.historyPlayers)
    for (var i = 0; i < playersArray.length; i++) {
        var player = game.historyPlayers[playersArray[i]]
        var user = getUserQuery(player.guid)
        if (user.id == null) {
            insertUserQuery(player)
        } else {
            updateUserQuery(user, player)
        }
    }
    log(null, "Historial de partidas actualizado")
}

function showHistorysQuery(userobj) {
    log(userobj, "Historial de partidas - Top 10")
    var queryString = "SELECT * FROM games ORDER BY won_games DESC LIMIT 10"
    var query = new Query(queryString)
    var sql = new Sql()
    sql.open(dbName)
    if (sql.connected) {
        sql.query(query)
        var i = 1
        while (sql.read) {
            var user = new Object()
            user.id = sql.value("id")
            user.userid = sql.value("userid")
            user.user = sql.value("user")
            user.total_points = parseInt(sql.value("total_points"))
            user.won_games = parseInt(sql.value("won_games"))
            log(userobj, "\x0302" + i + ". \x06" + user.user + ": " + user.won_games + " \x06partidas ganadas, \x06" + user.total_points + " \x06puntos")
            i++
        }
        sql.close()
    } else {
        log(null, "\x0304\x06Error al conectar con la base de datos:\x06" + sql.lastError)
    }
}

function getUserQuery(userid) {
    var queryString = "SELECT * FROM games WHERE userid = {0}"
    var query = new Query(queryString, userid)
    var sql = new Sql()
    var user = new Object()
    sql.open(dbName)
    if (sql.connected) {
        sql.query(query)
        while (sql.read) {
            user.id = sql.value("id")
            user.userid = sql.value("userid")
            user.user = sql.value("user")
            user.total_points = parseInt(sql.value("total_points"))
            user.won_games = parseInt(sql.value("won_games"))
        }
        sql.close()
    } else {
        log(null, "\x0304\x06Error al conectar con la base de datos:\x06" + sql.lastError)
    }
    return user
}

function help(userobj) {
    print(userobj, "#nuevojuego")
    print(userobj, "#empezarjuego")
    print(userobj, "#terminarjuego")
    print(userobj, "#historialjuego | Para ver el historial de partidas")
    print(userobj, "#palabrajuego palabra | Para configurar la palabra, 5 letras mínimo")
    print(userobj, "#aleatoriojuego | Para configurar una palabra aleatoria")
    print(userobj, "?palabra | Para adivinar la palabra")
    print(userobj, "#entrarjuego | Para unirse a la partida")
}

function log(userobj, text) {
    if (!userobj)
        print("\x0302\x06Juego del Ahorcado\x06 | " + text)
    else
        print(userobj, "\x0302\x06Juego del Ahorcado\x06 | " + text)
}

function dropDatabaseQuery() {
    var queryString = "DROP TABLE IF EXISTS games"
    var query = new Query(queryString)
    var sql = new Sql()
    sql.open(dbName)
    if (sql.connected) {
        sql.query(query)
        sql.close()
        return true
    }
    return false
}

function initDatabaseQuery() {
    var queryString = "CREATE TABLE IF NOT EXISTS games (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, user TEXT NOT NULL, userid TEXT NOT NULL, total_points INTEGER NOT NULL, won_games INTEGER NOT NULL)"
    var query = new Query(queryString)
    var sql = new Sql()
    sql.open(dbName)
    if (sql.connected) {
        sql.query(query)
        sql.close()
        return true
    }
    return false
}

function resetDatabase() {
    var dropQueryResult = dropDatabaseQuery()
    var initQueryResult = initDatabaseQuery()
    return dropQueryResult && initQueryResult
}