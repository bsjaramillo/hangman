include("utils.js")

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
        log(null, "by " + scriptAuthor + " - \x06" + scriptVersion)
    else
        log(null, "\x0304\x06Error al cargar script " + scriptVersion)
}

function onPart(userobj) {
    if (!existsGame) return
    if (!(userobj.id in game.players)) return
    delete game.players[userobj.id]
    var numPlayers = Object.keys(game.players).length
    log(null, "\x0304" + userobj.name + " ha abandonado la partida, " + numPlayers + " jugador(es)")
    if (numPlayers < 2) {
        log(null, "\x0304Se termina la partida por falta de jugadores")
        endGame(false)
    }
}

var commands = {
    "helpahorcado": function (userobj) {
        help(userobj)
    },
    "nuevojuego": function (userobj, command) {
        if (existsGame && userobj.id != game.owner) {
            log(null, "Ya existe una partida creada por " + user(game.owner).name)
            return
        }
        if (!existsGame) {
            initGame()
            game.owner = userobj.id
            log(null, "Nueva partida creada por " + userobj.name)
            existsGame = true;
        }
        var args = command.split(" ")
        if (args.length == 1)
            loadRandomWord(userobj)
        else
            setWordGame(userobj, args[1])
    },
    "entrarjuego": function (userobj, args) {
        addPlayer(userobj)
    },
    "empezarjuego": function (userobj, args) {
        startGame(userobj)
    },
    "terminarjuego": function (userobj, args) {
        if (!existsGame) {
            log(null, "No se ha creado una partida")
            return
        }
        if (userobj.id != game.owner) {
            log(null, "\x0304Solo el anfitrión de la partida puede terminarla")
            return
        }
        endGame(false)
    },
    "historialjuego": function (userobj, args) {
        showHistorysQuery(userobj)
    }
}

function onCommand(userobj, command, target, args) {
    var cmd = command.split(" ")[0];
    cmd = cmd.toLowerCase();
    if (cmd in commands) {
        commands[cmd](userobj, command)
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
    if (text.indexOf("?") == 0) {
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
            if (!validateChar(text, userobj))
                return
        } else
            log(null, "\x06" + userobj.name + " \x0304\x06ya se usó la letra \x06" + text)
        playGame(userobj)
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
    var word = cmd.replace(/\x06|\x09|\x07|\x03[0-9]{2}|\x05[0-9]{2}/g, "");
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
        endGame(true)
        return
    } else {
        log(null, userobj.name + " buen intento, pero \x06\x0304" + word + "\x06\x0302 no es la palabra")
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

function playGame(userobj) {
    var playersArray = Object.keys(game.players)
    var playerSelected = playersArray[game.currentPositon]
    var currentWord = showWord()
    if (currentWord == game.word) {
        log(null, "(H) \x0310\x06" + userobj.name + " \x06\x0302completó la palabra (H), la palabra era \x06\x0304" + game.word)
        game.winner = userobj.id
        endGame(true)
    } else {
        log(null, "\x0310\x06" + game.players[playerSelected].name + "\x06\x0302 es tu turno, arroja una letra")
    }
}

function showPoints(wordWasGuessed) {
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
    else {
        if (wordWasGuessed)
            log(null, "Ganador de la partida: (H)(H)(H) \x06" + game.historyPlayers[winnerId].name + " (H)(H)(H), \x06Puntaje final: " + winnerPoints)
        else
            log(null, "Nadie ganó la partida")
    }

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
                endGame(false)
                return false
            }
        }
    }
    return true
}

function endGame(wordWasGuessed) {
    existsGame = false
    if (!wordWasGuessed)
        log(null, "\x0301Fin del juego, nadie adivinó la palabra, la palabra era \x06" + game.word)
    showPoints(wordWasGuessed)
    updateHistorys()
    initGame()
    log(null, "Partida terminada")
}

function updateUserQuery(user, player) {
    var points = parseInt(user.total_points) + parseInt(game.points[player.id])
    var wonGames = parseInt(user.won_games)
    if (game.winner == player.id)
        wonGames = parseInt(user.won_games) + 1
    var updateQuery = new Query("UPDATE games SET total_points = {0}, won_games = {1} WHERE userid = {2}", points, wonGames, player.guid)
    query(updateQuery, dbName, null)
}

function insertUserQuery(user) {
    var wonGames = 0
    if (game.winner == user.id)
        wonGames = 1
    var insertQuery = new Query("INSERT INTO games (userid, user, total_points, won_games) VALUES ({0}, {1}, {2}, {3})", user.guid, user.name, game.points[user.id], wonGames)
    query(insertQuery, dbName, null)
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
    var selectQuery = new Query("SELECT * FROM games ORDER BY total_points DESC LIMIT 10")
    query(selectQuery, dbName, function (sql) {
        var i = 1
        while (sql.read) {
            var user = new Object()
            user.id = sql.value("id")
            user.userid = sql.value("userid")
            user.user = sql.value("user")
            user.total_points = parseInt(sql.value("total_points"))
            user.won_games = parseInt(sql.value("won_games"))
            log(userobj, "\x0302" + i + ". \x06" + user.user + ": " + user.total_points + " \x06puntos, \x06" + user.won_games + " \x06partidas ganadas")
            i++
        }
    })
}

function getUserQuery(userid) {
    var userQuery = new Query("SELECT * FROM games WHERE userid = {0}", userid)
    var user = new Object()
    query(userQuery, dbName, function (sql) {
        while (sql.read) {
            user.id = sql.value("id")
            user.userid = sql.value("userid")
            user.user = sql.value("user")
            user.total_points = parseInt(sql.value("total_points"))
            user.won_games = parseInt(sql.value("won_games"))
        }
    })
    return user
}

function help(userobj) {
    print(userobj, "#nuevojuego palabra | Para crear una partida, la palabra es opcional y debe tener mínimo 5 letras")
    print(userobj, "Si no se configura una palabra, se cargará una palabra aleatoria")
    print(userobj, "#empezarjuego")
    print(userobj, "#terminarjuego")
    print(userobj, "#historialjuego | Para ver el historial de partidas")
    print(userobj, "?palabra | Para adivinar la palabra")
    print(userobj, "#entrarjuego | Para unirse a la partida")
}

function dropDatabaseQuery() {
    var dropQuery = new Query("DROP TABLE IF EXISTS games")
    return query(dropQuery, dbName)
}

function initDatabaseQuery() {
    var initQuery = new Query("CREATE TABLE IF NOT EXISTS games (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, user TEXT NOT NULL, userid TEXT NOT NULL, total_points INTEGER NOT NULL, won_games INTEGER NOT NULL)")
    return query(initQuery, dbName)
}

function resetDatabase() {
    var dropQueryResult = dropDatabaseQuery()
    var initQueryResult = initDatabaseQuery()
    return dropQueryResult && initQueryResult
}
