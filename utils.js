include("constants.js")
function log(userobj, text) {
    if (!userobj)
        print(preLogMessage + text)
    else
        print(userobj, preLogMessage + text)
}

function query(query, dbName = "", callback = null) {
    var sql = new Sql()
    sql.open(dbName)
    if (sql.connected) {
        sql.query(query)
        if (callback) {
            callback(sql)
        }
        sql.close()
        return true
    }
    return false
}