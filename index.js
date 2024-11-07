var { Options } = require('selenium-webdriver/chrome')
const { Builder, Browser, By, Key, until } = require('selenium-webdriver');
var fs = require('fs');
const { is } = require('express/lib/request');
const { generateKey } = require('crypto');
const { Console } = require('console');



(async function example() {
    var baseUrl = "https://www.basketball-reference.com";
    var exceptions = [];
    try { exceptions = await load("exceptions", "BaseData"); } catch { }
    let driver = await new Builder()
        .withCapabilities(
            Options.chrome()
                //.setPageLoadStrategy('eager')
                .setPageLoadStrategy('none')
        ).build()

    try {
        //await LogIn();
        //await getTableData("/leagues/" ,"stats", "BaseData");
        //await getSeasonsPerYear();
        //await getSchedulesPerYear();
        //await getGamesPerYear();

        // var years = [2024, 2023, 2022];//[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000, 1999];
        // for (let index = 0; index < years.length; index++) {
        //     const yearTo = years[index];
        //     await prepareData(yearTo);
        //     await formatGamesPerTeam(yearTo);
        //     await generateAverages(yearTo);
        // }


        // var years = [2023];//[2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000];
        // for (let index = 0; index < years.length; index++) {
        //     const yearTo = years[index];
        //     var toBeEvaluated = false;
        //     await generateMLRecords(yearTo, toBeEvaluated);
        // }
        // var MLData = [];
        // for (let index = 0; index < years.length; index++) {
        //     const yearTo = years[index];
        //     var data = await load(yearTo + "MLData", "AnalysisData")
        //     MLData = MLData.concat(data);
        //     await save("MLData", MLData, function () { }, "replace", "AnalysisData")
        // }

        var years = [2024];
        for (let index = 0; index < years.length; index++) {
            const yearTo = years[index];
            var toBeEvaluated = true;
            await generateMLRecords(yearTo, toBeEvaluated);
        }

    }
    catch (Ex) {
        console.log(Ex);
        await driver.quit();
        await example();
    } finally {
        await driver.quit();
        //await example();
    }

    async function LogIn() {
        var loginUrl = "https://stathead.com/users/login.cgi?token=1&_gl=1*isv5wn*_ga*MTM5MDMxMzA2NS4xNzI0ODc1NTMx*_ga_80FRT7VJ60*MTcyNDg3NTUzMC4xLjAuMTcyNDg3NTUzMC4wLjAuMA..&redirect_uri=https%3A//www.basketball-reference.com/leagues/NBA_2025_games.html";
        var data = [];
        //await driver.manage().setTimeouts({ explicit: 3000 });

        await driver.manage().setTimeouts({ implicit: 200 });
        await driver.get(loginUrl);
        // await driver.wait(until.elementLocated(By.id(tables[tables.length-1])), // Condition to wait for
        //     3000 // Timeout in milliseconds (10 seconds)
        // );
        let loginElement = await driver.wait(until.elementLocated(By.id('username')), 10000);
        await driver.wait(until.elementIsVisible(loginElement), 10000);

        await driver.findElement(By.id('username')).sendKeys('jose.carbajal.salinas@gmail.com');
        await driver.findElement(By.id('password')).sendKeys('Lom@s246', Key.RETURN);


        let loadElement = await driver.wait(until.elementLocated(By.id('schedule')), 10000);
        await driver.wait(until.elementIsVisible(loadElement), 10000);
    }

    async function generateMLRecords(yearToProcess, toBeEvaluated) 
    {
        try {
            if (!toBeEvaluated) {
                var MLData = []; //await load(yearToProcess+"MLData", "AnalysisData");
            } else {
                var MLData = await load(yearToProcess + "MLDataToEvaluate", "AnalysisData");
            }
        }
        catch {
            var MLData = [];
        }


        var years = await load("years", "BaseData");

        for (let index = 0; index < years.length; index++) {
            const year = years[index];

            var isYear = parseInt(year.season.split("-")[0]);
            if (!isNaN(isYear) && isYear == yearToProcess) {
                var teamsE = await load("schedules_confs_standings_E", year.season);
                var teamsW = await load("schedules_confs_standings_W", year.season);
                var teams = teamsE.concat(teamsW);
                for (let df = 0; df < teams.length; df++) {
                    const team = teams[df];
                    var school_name = team.team_nameLink.split("/")[2].replace(" ","_");
                    var schedules = await load("schedules_games_" + team.team_nameLink.split('/')[2], year.season);

                    if(schedules.length > 0 && isYear != 2024 && isYear == yearToProcess){
                        for (let rat = (schedules.length-1); rat >= 0; rat--) {
                            const schedule = schedules[rat];
                            var schedule_name = formatDateString(schedule.date_game).replace(" ","_").replace(" ","_").replace(",","");
                            var gameRecords = [];
                            var gameResults = [];
                            var averageRecords = [];
                            try{
                                gameRecords = await load("gameRecords","AnalysisData/" + isYear);
                                gameResults = await load("formatedRecords","AnalysisData/" + isYear);
                                averageRecords = await load("averageRecords","AnalysisData/" + isYear);

                                var gameRecord = gameRecords.filter(function(item){return (item.homeTeam == school_name || item.awayTeam == school_name) && item.date == schedule_name});
                                var opponentName = gameRecord[0].homeTeam == school_name ? gameRecord[0].awayTeam : gameRecord[0].homeTeam;
                                var selectedAverage = averageRecords.filter(function(item){return item.team == school_name && item.date == schedule_name});
                                var opponentAverage = averageRecords.filter(function(item){return item.team == opponentName && item.date == schedule_name});
                                var selectedGameResults = gameResults.filter(function(item){return item.team == school_name});
                                var selectedIndex = selectedGameResults.findIndex(x =>x.date == schedule_name);
                                if(selectedIndex > 0)
                                {
                                    var selectedGameResult = selectedGameResults[selectedIndex-1];
                                }
                                else{
                                    try{
                                        gameResults = await load("formatedRecords","AnalysisData/" + (isYear-1));
                                        var selectedGameResults = gameResults.filter(function(item){return item.team == school_name});
                                        var selectedGameResult = selectedGameResults[selectedGameResults.length-1];
                                    }
                                    catch{
                                        var selectedGameResult = null;
                                        var stopHere = "";
                                    }
                                }
                                if(selectedAverage[0].defAllowedFirstDowns == 0 && selectedAverage[0].offenseFirstDowns == 0)
                                {
                                    try{
                                        var arr = [];
                                        averageRecords = await load("averageRecords","AnalysisData/" + (isYear-1));
                                        var selectedAverage = averageRecords.filter(function(item){return item.team == school_name});
                                        var selectedAvg = selectedAverage[selectedAverage.length-1];
                                        arr.push(selectedAvg);
                                        selectedAverage = arr;
                                    }
                                    catch{
                                        var selectedAverage = [];
                                    }
                                    var stopHere = "";
                                    //todo
                                }
                                var opponentGameResults = gameResults.filter(function(item){return item.team == opponentName});
                                var opponentIndex = opponentGameResults.findIndex(x =>x.date == schedule_name);
                                if(opponentIndex > 0)
                                {
                                    var opponentGameResult = opponentGameResults[opponentIndex-1];
                                }
                                else{
                                    try{
                                        gameResults = await load("formatedRecords","AnalysisData/" + (isYear-1));
                                        var opponentGameResults = gameResults.filter(function(item){return item.team == opponentName});
                                        var opponentGameResult = opponentGameResults[opponentGameResults.length-1];
                                    }
                                    catch{
                                        var opponentGameResult = null;
                                        var stopHere = "";
                                    }
                                    
                                }
                                if(opponentAverage[0].defAllowedFirstDowns == 0 && opponentAverage[0].offenseFirstDowns == 0)
                                {
                                    try{
                                        var arr = [];
                                        averageRecords = await load("averageRecords","AnalysisData/" + (isYear-1));
                                        var opponentAverage = averageRecords.filter(function(item){return item.team == opponentName});
                                        var opponentAvg = opponentAverage[opponentAverage.length-1];
                                        arr.push(opponentAvg);
                                        opponentAverage = arr;
                                    }
                                    catch{
                                        var opponentAverage = [];
                                    }
                                    var stopHere = "";
                                    //todo
                                }
                                
                            if(gameRecord.length > 0 && selectedAverage.length > 0 && selectedGameResult && opponentAverage.length > 0 && opponentGameResult)
                            {
                                var MLRecord = {};
                                MLRecord.key = gameRecord[0].key;
                                MLRecord.date = gameRecord[0].date;
                                
                                MLRecord.homeTeam = gameRecord[0].homeTeam;
                                MLRecord.awayTeam = gameRecord[0].awayTeam;
                                // var homeRecords = gameRecord[0].homeTeam == selectedGameResult.team ? selectedGameResult : opponentGameResult;
                                // MLRecord = appendProperties(MLRecord, homeRecords, "home");
                                // var awayRecords = gameRecord[0].awayTeam == opponentGameResult.team ? opponentGameResult : selectedGameResult;
                                // MLRecord = appendProperties(MLRecord, awayRecords, "away");
                                var homeAverageRecords = gameRecord[0].homeTeam == selectedAverage[0].team ? selectedAverage[0] : opponentAverage[0];
                                MLRecord = appendProperties(MLRecord, homeAverageRecords, "homeAvg");
                                var awayAverageRecords = gameRecord[0].awayTeam == opponentAverage[0].team ? opponentAverage[0] : selectedAverage[0];
                                MLRecord = appendProperties(MLRecord, awayAverageRecords, "awayAvg");

                                if(!toBeEvaluated){
                                    MLRecord.isHomeWinner = gameRecord[0].isHomeWinner;
                                    MLRecord.scoreDiff = gameRecord[0].scoreDiff;
                                    MLRecord.totalPoints = gameRecord[0].totalPoints;
                                }
                                else{
                                    MLRecord.isHomeWinner = 0;
                                    MLRecord.scoreDiff = 0;
                                    MLRecord.totalPoints = 0;
                                    // MLRecord.awayAvgDefAllowedPoints = 0;
                                    // MLRecord.awayAvgOffensePoints = 0;
                                    // MLRecord.homeAvgDefAllowedPoints = 0;
                                    // MLRecord.homeAvgOffensePoints = 0;
                                }
                                if(MLRecord.homeAvgOffenseTotalYD  == 0 || MLRecord.awayAvgOffenseTotalYD  == 0){
                                var stopHere = ""
                                }
                                var isThere = MLData.filter(function(item){return item.key == MLRecord.key });
                                if(isThere.length == 0){
                                    MLData.push(MLRecord);
                                    if(!toBeEvaluated){
                                        await save(yearToProcess+"MLData",MLData, function(){}, "replace" ,"AnalysisData");
                                    }
                                    else{
                                        await save(yearToProcess+"MLDataToEvaluate",MLData, function(){}, "replace" ,"AnalysisData");
                                    }
                                }
                            }
                            }
                            catch(Ex){
                                
                            }
                            
                        }
                    }
                    else{
                        for (let rat = 0; rat < schedules.length; rat++) {
                            if(rat <= 14){
                                var stopHere = "";
                            
                            const schedule = schedules[rat];
                            var homePossibleTeam = schedule.box_score_textLink.split(".")[0].slice(-3);
                            var opponentName = schedule.opp_nameLink.split('/')[2];
                            school_name = school_name.replace(/\s+/g, '').replace(/\(\d{1,2}\)/, '').replace("_","");
                            var home_name = null;
                            var away_name = null;
                            if(homePossibleTeam.indexOf("-")<0)
                            {
                               home_name = school_name.toLowerCase().indexOf(homePossibleTeam.toLowerCase()) >=0 ? school_name : opponentName.toLowerCase().indexOf(homePossibleTeam.toLowerCase()) >=0 ? opponentName : null;
                               if(home_name){
                                    away_name = home_name == school_name ? opponentName : school_name;
                               }
                            }
                            else{
                                var option1 = homePossibleTeam.replace(/\s+/g, '').replace(/\(\d{1,2}\)/, '').replace("_","").replace(/-/g,"");
                                home_name = school_name.toLowerCase().indexOf(option1.toLowerCase()) >=0 ? school_name : opponentName.toLowerCase().indexOf(option1.toLowerCase()) >=0 ? opponentName : null;
                                if(home_name){
                                    away_name = home_name == school_name ? opponentName : school_name;
                               }
                            }
                            if(!home_name)
                            {
                                var options = homePossibleTeam.split("-");
                                for (let index = 0; index < options.length; index++) {
                                    const option = options[index];
                                    home_name = school_name.toLowerCase().indexOf(option.toLowerCase()) >=0 ? school_name : opponentName.toLowerCase().indexOf(option1.toLowerCase()) >=0 ? opponentName : null;
                                    if(home_name){
                                        away_name = home_name == school_name ? opponentName : school_name;
                                        break;
                                    }
                                }
                                
                                if(!home_name){
                                    var lastOption = "";
                                    for (let index = 0; index < options.length; index++) {
                                        const option = options[index];
                                        lastOption += option.charAt(0);
                                    }
                                    home_name = school_name.toLowerCase().indexOf(lastOption.toLowerCase()) >=0 ? school_name : opponentName.toLowerCase().indexOf(lastOption.toLowerCase()) >=0 ? opponentName : null;
                                    if(home_name){
                                        away_name = home_name == school_name ? opponentName : school_name;
                                    }
                                    else{
                                        var stopHere = "";
                                    }
                               }
                            }
                            if(away_name == 'FloridaInternational' && home_name == "Liberty")
                            {
                                var stopHere = "";
                            }
                            var schedule_name = schedule.date_game.replace(" ","_").replace(" ","_").replace(",","");
                            var gameRecords = [];
                            var gameResults = [];
                            var averageRecords = [];
                            

                            try{
                                //gameRecords = await load("gameRecords","AnalysisData/" + isYear);
                                
                                try{
                                    if(rat == 0){
                                    gameResults = await load("formatedRecords","AnalysisData/" + (isYear-1));
                                    var selectedGameResults = gameResults.filter(function(item){return item.team == home_name});
                                    var selectedGameResult = selectedGameResults[selectedGameResults.length-1];
                                    }
                                    else{
                                        gameResults = await load("formatedRecords","AnalysisData/" + (isYear));
                                        var selectedGameResults = gameResults.filter(function(item){return item.team == home_name});
                                        var selectedGameResult = selectedGameResults[selectedGameResults.length-1];
                                        selectedGameResult = typeof selectedGameResult == "undefined" || selectedGameResult == null ? selectedGameResults[selectedGameResults.length-1] : selectedGameResult;
                                    }
                                }
                                catch{
                                    var selectedGameResult = null;
                                    var stopHere = "";
                                }
                                
                                try{
                                    if(rat == 0){
                                    var arr = [];
                                    averageRecords = await load("averageRecords","AnalysisData/" + (isYear-1));
                                    var selectedAverage = averageRecords.filter(function(item){return item.team == home_name});
                                    var selectedAvg = selectedAverage[selectedAverage.length-1];

                                    if(selectedAvg.defAllowedPoints != 0)
                                    {
                                        arr.push(selectedAvg);
                                    }
                                    selectedAverage = arr;
                                    }
                                    else{
                                        var arr = [];
                                        averageRecords = await load("averageRecords","AnalysisData/" + (isYear));
                                        var selectedAverage = averageRecords.filter(function(item){return item.team == home_name});
                                        var selectedAvg = selectedAverage[selectedAverage.length-1];
                                        selectedAvg = typeof selectedAvg == "undefined" || selectedAvg == null ? selectedAverage[selectedAverage.length-1] : selectedAvg;
                                        if((rat-1) <=0 )
                                        {
                                            if(selectedGameResult.defAllowedPoints != 0)
                                            {
                                                selectedAvg = selectedGameResult;
                                            }
                                                else{
                                                    selectedAvg = null;
                                                }
                                        }
                                        if(selectedAvg != null){
                                            arr.push(selectedAvg);
                                        }
                                        selectedAverage = arr;
                                    }
                                }
                                catch{
                                    var selectedAverage = [];
                                }
                                var stopHere = "";
                                //todo
                                
                                
                                try{
                                    if(rat ==0){
                                    gameResults = await load("formatedRecords","AnalysisData/" + (isYear-1));
                                    var opponentGameResults = gameResults.filter(function(item){return item.team == away_name});
                                    var opponentGameResult = opponentGameResults[opponentGameResults.length-1];
                                    }
                                    else{
                                        gameResults = await load("formatedRecords","AnalysisData/" + (isYear));
                                        var opponentGameResults = gameResults.filter(function(item){return item.team == away_name});
                                        var opponentGameResult = opponentGameResults[opponentGameResults.length-1];
                                        opponentGameResult = typeof opponentGameResult == "undefined" || opponentGameResult == null  ? opponentGameResults[opponentGameResults.length-1] : opponentGameResult;
                                        
                                    }
                                }
                                catch{
                                    var opponentGameResult = null;
                                    var stopHere = "";
                                }
                                 
                                try{
                                    if(rat==0){
                                    var arr = [];
                                    averageRecords = await load("averageRecords","AnalysisData/" + (isYear-1));
                                    var opponentAverage = averageRecords.filter(function(item){return item.team == away_name});
                                    var opponentAvg = opponentAverage[opponentAverage.length-1];
                                    if(away_name == "NorfolkState")
                                    {
                                        var stopHere = "";
                                    }
                                    if(opponentAvg.defAllowedPoints != 0)
                                    {
                                        arr.push(opponentAvg);
                                    }
                                    opponentAverage = arr;
                                    }
                                    else{
                                        var arr = [];
                                        averageRecords = await load("averageRecords","AnalysisData/" + (isYear));
                                        var opponentAverage = averageRecords.filter(function(item){return item.team == away_name});
                                        if(away_name == "NorfolkState")
                                        {
                                            var stopHere = "";
                                        }
                                        var opponentAvg = opponentAverage[opponentAverage.length-1];
                                        opponentAvg = typeof opponentAvg == "undefined" || opponentAvg == null ? opponentAverage[opponentAverage.length-1] : opponentAvg;
                                        if((rat-1) <=0 )
                                            {
                                                if(opponentGameResult.defAllowedPoints != 0)
                                                {
                                                    opponentAvg = opponentGameResult;
                                                }
                                                else{
                                                    opponentAvg = null;
                                                }
                                            }
                                            if(opponentAvg != null){
                                                arr.push(opponentAvg);
                                            }
                                        opponentAverage = arr;
                                    }
                                }
                                catch{
                                    var opponentAverage = [];
                                }

                               var homeTeam = home_name;
                               var awayTeam = away_name;
                               var key = awayTeam.replace(/\s+/g, '').replace(/\(\d{1,2}\)/, '')+ "@" + homeTeam.replace(/\s+/g, '').replace(/\(\d{1,2}\)/, '') + "@" + schedule_name;
                               var record = {key:key, date: schedule_name,homeTeam:homeTeam, awayTeam:awayTeam};
                               var gameRecord =[];
                               gameRecord.push(record);

                               if(selectedAverage[0].defAllowedPoints == 0 || opponentAverage[0].defAllowedPoints == 0)
                               {
                                    var stopHere = "";
                               }

                            if(gameRecord.length > 0 && selectedAverage.length > 0 && selectedGameResult && opponentAverage.length > 0 && opponentGameResult)
                            {
                                var MLRecord = {};
                                MLRecord.key = gameRecord[0].key;
                                MLRecord.date = gameRecord[0].date;
                                if(!toBeEvaluated){
                                    MLRecord.isHomeWinner = gameRecord[0].isHomeWinner;
                                    //MLRecord.scoreDiff = gameRecord[0].scoreDiff;
                                }
                                else{
                                    MLRecord.isHomeWinner = 0;
                                    //MLRecord.scoreDiff = 0;
                                }
                                MLRecord.homeTeam = gameRecord[0].homeTeam;
                                MLRecord.awayTeam = gameRecord[0].awayTeam;
                                //var homeRecords = gameRecord[0].homeTeam == selectedGameResult.team ? selectedGameResult : opponentGameResult;
                                //MLRecord = appendProperties(MLRecord, homeRecords, "home");
                                //var awayRecords = gameRecord[0].awayTeam == opponentGameResult.team ? opponentGameResult : selectedGameResult;
                                //MLRecord = appendProperties(MLRecord, awayRecords, "away");
                                var homeAverageRecords = gameRecord[0].homeTeam == selectedAverage[0].team ? selectedAverage[0] : opponentAverage[0];
                                MLRecord = appendProperties(MLRecord, homeAverageRecords, "homeAvg");
                                var awayAverageRecords = gameRecord[0].awayTeam == opponentAverage[0].team ? opponentAverage[0] : selectedAverage[0];
                                MLRecord = appendProperties(MLRecord, awayAverageRecords, "awayAvg");
                                var stopHere = ""
                                var isThere = MLData.filter(function(item){return item.key == MLRecord.key });
                                if(isThere.length == 0){
                                    MLData.push(MLRecord);
                                    if(!toBeEvaluated){
                                        await save(yearToProcess+"MLData",MLData, function(){}, "replace" ,"AnalysisData");
                                    }
                                    else{
                                        await save(yearToProcess+"MLDataToEvaluate",MLData, function(){}, "replace" ,"AnalysisData");
                                    }
                                }
                            }
                            else{
                                var stopHere = "";
                            }
                            }
                            catch(Ex){
                                
                            }
                        }
                        }

                    }
                }
            }
        }

    }

    function extractTextBetween(inputString) {
        const regex = /\d{4}-\d{2}-\d{2}-(.*)\.html/;
        const match = inputString.match(regex);
    
        if (match && match[1]) {
            return match[1];
        } else {
            return null; // Return null if no match is found
        }
    }

    function appendProperties(finalObject, originalObject, prefix) {
        for (let key in originalObject) {
            if (originalObject.hasOwnProperty(key)) {
                // Check if the key starts with "def" or "offense"
                if (key.startsWith("def") || key.startsWith("offense")) {
                    // Create a new key with the prefix
                    let newKey = prefix + key.charAt(0).toUpperCase() + key.slice(1);
                    // Add the new key to finalObject with the original value
                    finalObject[newKey] = originalObject[key];
                }
            }
        }
        return finalObject;
    }

    async function formatGamesPerTeam(yearToProcess) {
        try {
            var isProcessed = await load("formatedRecords", "AnalysisData/" + yearToProcess);
        }
        catch {
            var isProcessed = []
        }
        if (isProcessed.length == 0) {
            var data = await load("gameRecords", "AnalysisData/" + yearToProcess);
            try {
                var formatedRecords = await load("formatedRecords", "AnalysisData/" + yearToProcess);
            }
            catch {
                var formatedRecords = [];
            }
            var homeTeams = data.map(function (item) {
                return item.homeTeam;
            });
            var awayTeams = data.map(function (item) {
                return item.awayTeam;
            });

            var teams = homeTeams.concat(awayTeams);
            var uniqueValues = Array.from(new Set(teams));
            for (let index = 0; index < uniqueValues.length; index++) {
                const team = uniqueValues[index];
                var games = data.filter(function (item) {
                    return item.homeTeam == team || item.awayTeam == team;
                });
                var sortedGames = sortByDate(games);
                var week = 0
                for (let i = 0; i < sortedGames.length; i++) {
                    const game = sortedGames[i];
                    var teamRecord = {};
                    teamRecord.team = team;
                    teamRecord.date = game.date;
                    teamRecord.key = team + "_" + game.date;
                    var isOffense = game.homeTeam == team ? "home" : "away";
                    var transformmedRecords = transformPropertyNames(game, isOffense);
                    teamRecord.defAllowedPoints = transformmedRecords.defenseFinalScore == null || isNaN(transformmedRecords.defenseFinalScore) ? 0 : transformmedRecords.defenseFinalScore;
                    teamRecord.defAllowedEfg_pct = transformmedRecords.defenseEfg_pct == null || isNaN(transformmedRecords.defenseEfg_pct) ? 0 : transformmedRecords.defenseEfg_pct;
                    teamRecord.defCreatedFt_rate = transformmedRecords.defenseFt_rate == null || isNaN(transformmedRecords.defenseFt_rate) ? 0 : transformmedRecords.defenseFt_rate;
                    teamRecord.defOff_rtg = transformmedRecords.defenseOff_rtg == null || isNaN(transformmedRecords.defenseOff_rtg) ? 0 : transformmedRecords.defenseOff_rtg;
                    teamRecord.defPace = transformmedRecords.defensePace == null || isNaN(transformmedRecords.defensePace) ? 0 : transformmedRecords.defensePace;
                    teamRecord.defTov_pct = transformmedRecords.defenseTov_pct == null || isNaN(transformmedRecords.defenseTov_pct) ? 0 : transformmedRecords.defenseTov_pct;

                    teamRecord.defAllowedPointsQ1 = transformmedRecords.defenseQ1 == null || isNaN(transformmedRecords.defenseQ1) ? 0 : transformmedRecords.defenseQ1;
                    teamRecord.defAllowedPointsQ2 = transformmedRecords.defenseQ2 == null || isNaN(transformmedRecords.defenseQ2) ? 0 : transformmedRecords.defenseQ2;
                    teamRecord.defAllowedPointsQ3 = transformmedRecords.defenseQ3 == null || isNaN(transformmedRecords.defenseQ3) ? 0 : transformmedRecords.defenseQ3;
                    teamRecord.defAllowedPointsQ4 = transformmedRecords.defenseQ4 == null || isNaN(transformmedRecords.defenseQ4) ? 0 : transformmedRecords.defenseQ4;

                    teamRecord.offensePoints = transformmedRecords.offenseFinalScore == null || isNaN(transformmedRecords.offenseFinalScore) ? 0 : transformmedRecords.offenseFinalScore;
                    teamRecord.offenseAllowedEfg_pct = transformmedRecords.offenseEfg_pct == null || isNaN(transformmedRecords.offenseEfg_pct) ? 0 : transformmedRecords.offenseEfg_pct;
                    teamRecord.offenseCreatedFt_rate = transformmedRecords.offenseFt_rate == null || isNaN(transformmedRecords.offenseFt_rate) ? 0 : transformmedRecords.offenseFt_rate;
                    teamRecord.offenseOff_rtg = transformmedRecords.offenseOff_rtg == null || isNaN(transformmedRecords.offenseOff_rtg) ? 0 : transformmedRecords.offenseOff_rtg;
                    teamRecord.offensePace = transformmedRecords.offensePace == null || isNaN(transformmedRecords.offensePace) ? 0 : transformmedRecords.offensePace;
                    teamRecord.offenseTov_pct = transformmedRecords.offenseTov_pct == null || isNaN(transformmedRecords.offenseTov_pct) ? 0 : transformmedRecords.offenseTov_pct;
                    teamRecord.offensePointsQ1 = transformmedRecords.offenseQ1 == null || isNaN(transformmedRecords.offenseQ1) ? 0 : transformmedRecords.offenseQ1;
                    teamRecord.offensePointsQ2 = transformmedRecords.offenseQ2 == null || isNaN(transformmedRecords.offenseQ2) ? 0 : transformmedRecords.offenseQ2;
                    teamRecord.offensePointsQ3 = transformmedRecords.offenseQ3 == null || isNaN(transformmedRecords.offenseQ3) ? 0 : transformmedRecords.offenseQ3;
                    teamRecord.offensePointsQ4 = transformmedRecords.offenseQ4 == null || isNaN(transformmedRecords.offenseQ4) ? 0 : transformmedRecords.offenseQ4;

                    formatedRecords.push(teamRecord);
                    await save("formatedRecords", formatedRecords, function () { }, "replace", "AnalysisData/" + yearToProcess);
                    var stopHere = "";
                }
                var stopHere = "";
            }
        }
    }

    async function generateAverages(yearToProcess) {
        console.log("Averaging data for: " + yearToProcess);
        var data = await load("formatedRecords", "AnalysisData/" + yearToProcess);
        try {
            var averageRecords = await load("averageRecords", "AnalysisData/" + yearToProcess);
        }
        catch {
            var averageRecords = [];
        }
        var teams = data.map(function (item) {
            return item.team;
        });
        var uniqueValues = Array.from(new Set(teams));
        for (let index = 0; index < uniqueValues.length; index++) {
            const team = uniqueValues[index];
            var games = data.filter(function (item) {
                return item.team == team;
            });
            var sortedGames = sortByDate(games);
            var averageGames = calculateAverages(sortedGames);
            averageRecords = averageRecords.concat(averageGames);
            await save("averageRecords", averageRecords, function () { }, "replace", "AnalysisData/" + yearToProcess);
        }
    }

    function calculateAverages(data) {
        let result = [];

        for (let i = 0; i < data.length; i++) {
            let current = data[i];
            let newObject = {};

            if (i === 0) {
                // For the first object, set all numeric values to 0
                for (let key in current) {
                    if (typeof current[key] === 'number') {
                        newObject[key] = 0;
                    } else {
                        newObject[key] = current[key];
                    }
                }
            } else {
                // For subsequent objects, calculate the averages based on previous objects
                for (let key in current) {
                    if (typeof current[key] === 'number') {
                        let sum = 0;
                        for (let j = 0; j < i; j++) {
                            sum += data[j][key];
                        }
                        newObject[key] = Math.round(sum / i);
                    } else {
                        newObject[key] = current[key];
                    }
                }
            }

            result.push(newObject);
        }

        return result;
    }

    function sortByDate(arr) {
        return arr.sort((a, b) => {
            // Convert the date strings to Date objects
            let dateA = new Date(a.date.replace(/_/g, ' '));
            let dateB = new Date(b.date.replace(/_/g, ' '));

            // Compare the two dates
            return dateA - dateB;
        });
    }

    function transformPropertyNames(obj, isOffense) {
        let transformedObj = {};

        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                let newKey = key;

                // Replace "home" with "offense"
                if (isOffense == "home") {
                    if (key.includes("home")) {
                        newKey = key.replace("home", "offense");
                    }

                    // Replace "away" with "defense"
                    if (key.includes("away")) {
                        newKey = key.replace("away", "defense");
                    }
                }
                else {
                    if (key.includes("home")) {
                        newKey = key.replace("home", "defense");
                    }

                    // Replace "away" with "defense"
                    if (key.includes("away")) {
                        newKey = key.replace("away", "offense");
                    }
                }

                // Add the transformed key and its value to the new object
                transformedObj[newKey] = obj[key];
            }
        }

        return transformedObj;
    }

    async function prepareData(yearToProcess) {

        var years = await load("years", "BaseData");

        for (let index = 0; index < years.length; index++) {
            const year = years[index];

            var isYear = parseInt(year.season.split("-")[0]);
            if (!isNaN(isYear) && isYear == yearToProcess) {
                var teamsE = await load("schedules_confs_standings_E", year.season);
                var teamsW = await load("schedules_confs_standings_W", year.season);
                var teams = teamsE.concat(teamsW);
                for (let df = 0; df < teams.length; df++) {
                    const team = teams[df];

                    var schedules = await load("schedules_games_" + team.team_nameLink.split('/')[2], year.season);

                    for (let dfs = 0; dfs < schedules.length; dfs++) {
                        const game = schedules[dfs];
                        if (game.box_score_textLink && game.game_result) {
                            //console.log(game.box_score_textLink);
                            var team_stats = await load("games_four_factors_" + game.box_score_textLink.split("/")[2].replace(".html", ""), year.season);
                            var results = await load("games_line_score_" + game.box_score_textLink.split("/")[2].replace(".html", ""), year.season);

                            var newResults = {
                                "home": {
                                    team: results[3]["team"],
                                    Q1: results[3]["1"],
                                    Q2: results[3]["2"],
                                    Q3: results[3]["3"],
                                    Q4: results[3]["4"],
                                    Final: results[3]["T"],
                                },
                                "away": {
                                    team: results[2]["team"],
                                    Q1: results[2]["1"],
                                    Q2: results[2]["2"],
                                    Q3: results[2]["3"],
                                    Q4: results[2]["4"],
                                    Final: results[2]["T"],
                                }

                            };

                            var newTeam_stats = [
                                {
                                    "stat": "efg_pct",
                                    "vis_stat": parseFloat(team_stats[2]["efg_pct"]),
                                    "home_stat": parseFloat(team_stats[3]["efg_pct"])
                                },
                                {
                                    "stat": "ft_rate",
                                    "vis_stat": parseFloat(team_stats[2]["ft_rate"]),
                                    "home_stat": parseFloat(team_stats[3]["ft_rate"])
                                },
                                {
                                    "stat": "off_rtg",
                                    "vis_stat": parseFloat(team_stats[2]["off_rtg"]),
                                    "home_stat": parseFloat(team_stats[3]["off_rtg"])
                                },
                                {
                                    "stat": "orb_pct",
                                    "vis_stat": parseFloat(team_stats[2]["orb_pct"]),
                                    "home_stat": parseFloat(team_stats[3]["orb_pct"])
                                },
                                {
                                    "stat": "pace",
                                    "vis_stat": parseFloat(team_stats[2]["pace"]),
                                    "home_stat": parseFloat(team_stats[3]["pace"])
                                },
                                {
                                    "stat": "tov_pct",
                                    "vis_stat": parseFloat(team_stats[2]["tov_pct"]),
                                    "home_stat": parseFloat(team_stats[3]["tov_pct"])
                                }
                            ];

                            try {
                                if (team_stats && newResults) {
                                    await addStatRecord(newResults, newTeam_stats, formatDateString(game.date_game), isYear);
                                }
                            }
                            catch (Ex) {
                                console.log(Ex);
                            }
                        }
                    }
                }
            }
        } 89
    }

    function formatDateString(dateString) {
        // Parse the date string
        const date = new Date(dateString);

        // Extract year, month, and day
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
        const day = String(date.getDate()).padStart(2, '0');

        // Format as "YYYY_MM_DD"
        return `${year}_${month}_${day}`;
    }

    async function addStatRecord(results, team_stats, date, year) {
        var stopHere = "";
        var data = {};
        data.key = results.away.team.replace(/\s+/g, '').replace(/\(\d{1,2}\)/, '') + "@" + results.home.team.replace(/\s+/g, '').replace(/\(\d{1,2}\)/, '') + "@" + date;
        data.date = date;
        data.homeTeam = results.home.team.replace(/\s+/g, '').replace(/\(\d{1,2}\)/, '');
        data.awayTeam = results.away.team.replace(/\s+/g, '').replace(/\(\d{1,2}\)/, '');
        data.homeEfg_pct = parseFloat(team_stats.filter(function (item) { return item.stat == "efg_pct" })[0].home_stat);
        data.awayEfg_pct = parseFloat(team_stats.filter(function (item) { return item.stat == "efg_pct" })[0].vis_stat);
        data.homeFt_rate = parseFloat(team_stats.filter(function (item) { return item.stat == "ft_rate" })[0].home_stat);
        data.awayFt_rate = parseFloat(team_stats.filter(function (item) { return item.stat == "ft_rate" })[0].vis_stat);
        data.homeOff_rtg = parseFloat(team_stats.filter(function (item) { return item.stat == "off_rtg" })[0].home_stat);
        data.awayOff_rtg = parseFloat(team_stats.filter(function (item) { return item.stat == "off_rtg" })[0].vis_stat);
        data.homeOrb_pct = parseFloat(team_stats.filter(function (item) { return item.stat == "orb_pct" })[0].home_stat);
        data.awayOrb_pct = parseFloat(team_stats.filter(function (item) { return item.stat == "orb_pct" })[0].vis_stat);
        data.homePace = parseFloat(team_stats.filter(function (item) { return item.stat == "pace" })[0].home_stat);
        data.awayPace = parseFloat(team_stats.filter(function (item) { return item.stat == "pace" })[0].vis_stat);
        data.homeTov_pct = parseFloat(team_stats.filter(function (item) { return item.stat == "tov_pct" })[0].home_stat);
        data.awayTov_pct = parseFloat(team_stats.filter(function (item) { return item.stat == "tov_pct" })[0].vis_stat);
        data.homeQ1 = parseInt(results.home.Q1);
        data.homeQ2 = parseInt(results.home.Q2);
        data.homeQ3 = parseInt(results.home.Q3);
        data.homeQ4 = parseInt(results.home.Q4);
        data.homeFinalScore = parseInt(results.home.Final);
        data.awayQ1 = parseInt(results.away.Q1);
        data.awayQ2 = parseInt(results.away.Q2);
        data.awayQ3 = parseInt(results.away.Q3);
        data.awayQ4 = parseInt(results.away.Q4);
        data.awayFinalScore = parseInt(results.away.Final);
        data.scoreDiff = Math.abs(data.homeFinalScore - data.awayFinalScore);
        data.totalPoints = Math.abs(data.homeFinalScore + data.awayFinalScore);
        data.isHomeWinner = data.homeFinalScore > data.awayFinalScore ? 1 : 0;
        try {
            var records = await load("gameRecords", "AnalysisData/" + year);
        }
        catch {
            var records = [];
        }
        var exitingRecord = records.filter(function (item) { return item.key == data.key });
        if (exitingRecord.length == 0) {
            records.push(data);
            await save("gameRecords", records, function () { }, "replace", "AnalysisData/" + year);
        }
        else {
            var stopHere = "";
        }
    }

    async function getSeasonsPerYear() {
        var years = await load("years", "BaseData");

        for (let index = 0; index < years.length; index++) {
            const year = years[index];

            var isLoaded = false;
            try {
                isLoaded = await load("schedules_confs_standings_W", year.season) ? true : false;
            }
            catch {
                var isYear = parseInt(year.season.split("-")[0]);
                if (!isLoaded && !isNaN(isYear)) {
                    await getTableData(year.seasonLink, "schedules", year.season);
                }
            }
        }
    }

    async function getSchedulesPerYear() {
        var years = await load("years", "BaseData");

        for (let index = 0; index < years.length; index++) {
            const year = years[index];




            var isYear = parseInt(year.season.split("-")[0]);
            if (!isNaN(isYear)) {
                var teamsE = await load("schedules_confs_standings_E", year.season);
                var teamsW = await load("schedules_confs_standings_W", year.season);
                var teams = teamsE.concat(teamsW);
                for (let df = 0; df < teams.length; df++) {
                    const team = teams[df];
                    var isLoaded = false;
                    try {
                        isLoaded = await load("schedules_games_" + team.team_nameLink.split('/')[2], year.season) ? true : false;
                    }
                    catch {
                        var isYear = parseInt(year.season.split("-")[0]);
                        if (!isLoaded && !isNaN(isYear)) {
                            await getTableData(team.team_nameLink.replace(".html", "_games.html"), "schedules", year.season, team.team_nameLink.split('/')[2]);
                        }
                    }
                }
            }



        }
    }

    async function getGamesPerYear() {
        var years = await load("years", "BaseData");

        for (let index = 0; index < years.length; index++) {
            const year = years[index];

            var isYear = parseInt(year.season.split("-")[0]);
            if (!isNaN(isYear)) {
                var teamsE = await load("schedules_confs_standings_E", year.season);
                var teamsW = await load("schedules_confs_standings_W", year.season);
                var teams = teamsE.concat(teamsW);
                for (let df = 0; df < teams.length; df++) {
                    const team = teams[df];

                    var schedules = await load("schedules_games_" + team.team_nameLink.split('/')[2], year.season);

                    for (let dfs = 0; dfs < schedules.length; dfs++) {
                        const game = schedules[dfs];

                        var isLoaded = false;
                        try {
                            isLoaded = await load("games_four_factors_" + game.box_score_textLink.split("/")[2].replace(".html", ""), year.season) ? true : false;
                        }
                        catch {
                            var isException = exceptions.filter(function (item) {
                                return item == game.box_score_textLink;
                            });
                            var isYear = parseInt(year.season.split("-")[0]);

                            if (game.box_score_textLink) {
                                var dateText = game.box_score_textLink.split("/")[2].slice(0, 8);
                                console.log(dateText);
                                var isPast = isDateInPast(dateText);
                                if (!isLoaded && !isNaN(isYear) && isException.length <= 0 && isPast) {
                                    await getTableData(game.box_score_textLink, "games", year.season, game.box_score_textLink.split("/")[2].replace(".html", ""));
                                }
                            }
                        }
                    }
                }
            }



        }
    }

    function isDateInPast(dateText) {
        // Convert dateText to a Date object
        const year = parseInt(dateText.slice(0, 4), 10);
        const month = parseInt(dateText.slice(4, 6), 10) - 1; // Months are zero-indexed in JS
        const day = parseInt(dateText.slice(6, 8), 10);

        const inputDate = new Date(year, month, day);
        const today = new Date();

        // Set today's time to midnight to only compare dates
        today.setHours(0, 0, 0, 0);

        // Return true if inputDate is before today, false otherwise
        return inputDate < today;
    }

    async function getTableData(url, fileName, foldername, team = null) {
        try {
            var tableUrl = baseUrl + url;
            var data = [];
            //await driver.manage().setTimeouts({ explicit: 3000 });

            await driver.manage().setTimeouts({ implicit: 200 });
            await driver.get(tableUrl);
            // await driver.wait(until.elementLocated(By.id(tables[tables.length-1])), // Condition to wait for
            //     3000 // Timeout in milliseconds (10 seconds)
            // );
            await new Promise(resolve => setTimeout(resolve, 2000));
            // let loadElement = await driver.wait(until.elementLocated(By.id('team_stats')), 2000);
            // await driver.wait(until.elementIsVisible(loadElement), 2000);
            let tables = await driver.findElements(By.className('stats_table'));
            if (tables.length != 0) {
                for (let ay = 0; ay < tables.length; ay++) {
                    //const tableId = tables[ay];
                    let table = tables[ay];
                    let tableId = await table.getAttribute('id');
                    if (tableId == "team_stats" || tableId == "games" || tableId == 'stats' || tableId == 'confs_standings_E' || tableId == "confs_standings_W" || tableId == "line_score" || tableId == "four_factors") {
                        await driver.executeScript(await JSgetTableDetails(tableId)).then(function (return_value) {
                            console.log(return_value);
                            data = JSON.parse(return_value);
                        });
                        if (team) {
                            var name = fileName != tableId ? fileName + "_" + tableId + "_" + team : fileName;
                        }
                        else {
                            var name = fileName != tableId ? fileName + "_" + tableId : fileName;
                        }
                        await save(name, data, function () { }, "replace", foldername);
                    }
                    else if (tableId == '') {
                        await driver.executeScript(await JSgetResultDetails(tableId)).then(function (return_value) {
                            console.log(return_value);
                            data = JSON.parse(return_value);
                        });
                        var name = fileName != tableId ? fileName + "_results" : fileName;
                        await save(name, data, function () { }, "replace", foldername);
                    }
                }
                return 1;
            }
            else {
                throw new Error("Check");
            }
        }
        catch (Ex) {
            try {
                const searchText = "We apologize, but we could not find the page requested by your device.";
                let paragraph = await driver.findElement(By.xpath(`//p[contains(text(), "${searchText}")]`));
                if (paragraph) {
                    exceptions.push(url);
                    await save("exceptions", exceptions, function () { }, "replace", "BaseData");
                }
            }
            catch { }
            try {
                const searchText2 = "We apologize, but we could not find the page requested by your device";
                let paragraph2 = await driver.findElement(By.xpath(`//p[contains(text(), "${searchText2}")]`));
                if (paragraph2) {
                    exceptions.push(url);
                    await save("exceptions", exceptions, function () { }, "replace", "BaseData");
                }
            }
            catch { }
            const searchText3 = "Cancelled";
            let paragraph2 = await driver.findElement(By.xpath(`//div[contains(text(), "${searchText3}")]`));
            if (paragraph2) {
                exceptions.push(url);
                await save("exceptions", exceptions, function () { }, "replace", "BaseData");
            }
            console.log("Table doesn't exits.");
            return 1;
        }
    }

})();

async function load(filename, foldername = null) {
    if (foldername) {
        const data = fs.readFileSync("./" + foldername + "/" + filename + ".json");
        return JSON.parse(data);
    }
    else {
        var folder = "";
        if (filename.indexOf("th") >= 0) {
            folder = filename.split("th")[0] + "th";
        }
        else if (filename.indexOf("rd") >= 0) {
            folder = filename.split("rd")[0] + "rd";
        }
        else if (filename.indexOf("nd") >= 0) {
            folder = filename.split("nd")[0] + "nd";
        }
        else if (filename.indexOf("st") >= 0) {
            folder = filename.split("st")[0] + "st";
            if (filename.indexOf("August1st") >= 0) {
                folder = filename.split("1st")[0] + "1st";
            }
            else if (filename.indexOf("August21st") >= 0) {
                folder = filename.split("21st")[0] + "21st";
            }
            else if (filename.indexOf("August31st") >= 0) {
                folder = filename.split("31st")[0] + "31st";
            }
        }
        const data = fs.readFileSync("./" + filename.split(/[0-9]/)[0] + "/" + folder + "/" + filename + ".json");
        return JSON.parse(data);
    }

}


async function save(fileName, jsonObject, callback, appendOrReplace, foldername = null) {
    if (foldername) {
        if (appendOrReplace == "replace") {
            var dir = "./" + foldername + "/";
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(dir + fileName + '.json', JSON.stringify(jsonObject), 'utf8', callback);
        }
    }
    else {
        if (appendOrReplace == "replace") {
            var folder = "";
            if (fileName.indexOf("th") >= 0) {
                folder = fileName.split("th")[0] + "th";
            }
            else if (fileName.indexOf("rd") >= 0) {
                folder = fileName.split("rd")[0] + "rd";
            }
            else if (fileName.indexOf("nd") >= 0) {
                folder = fileName.split("nd")[0] + "nd";
            }
            else if (fileName.indexOf("st") >= 0) {
                folder = fileName.split("st")[0] + "st";
                if (fileName.indexOf("August1st") >= 0) {
                    folder = fileName.split("1st")[0] + "1st";
                }
                else if (fileName.indexOf("August21st") >= 0) {
                    folder = fileName.split("21st")[0] + "21st";
                }
                else if (fileName.indexOf("August31st") >= 0) {
                    folder = fileName.split("31st")[0] + "31st";
                }
            }

            var dir = "./" + fileName.split(/[0-9]/)[0] + "/" + folder + "/";
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(dir + fileName + '.json', JSON.stringify(jsonObject), 'utf8', callback);
        }
    }
}

async function JSgetResultDetails() {
    var script = "var resultTable = document.getElementsByClassName('linescore nohover stats_table no_freeze')[0].getElementsByTagName('td');";
    script += "if(resultTable.length == 14){					";
    script += "	var result = {                                  ";
    script += "		'home': {                                   ";
    script += "			'team': resultTable[1].innerText,       ";
    script += "			'Q1': resultTable[2].innerText,         ";
    script += "			'Q2': resultTable[3].innerText,         ";
    script += "			'Q3': resultTable[4].innerText,         ";
    script += "			'Q4': resultTable[5].innerText,         ";
    script += "			'Final': resultTable[6].innerText       ";
    script += "		},                                          ";
    script += "		'away': {                                   ";
    script += "			'team': resultTable[8].innerText,       ";
    script += "			'Q1': resultTable[9].innerText,         ";
    script += "			'Q2': resultTable[10].innerText,        ";
    script += "			'Q3': resultTable[11].innerText,        ";
    script += "			'Q4': resultTable[12].innerText,        ";
    script += "			'Final': resultTable[13].innerText      ";
    script += "		}                                           ";
    script += "	};                                              ";
    script += "}else if(resultTable.length == 16){                 ";
    script += "	var result = {                                  ";
    script += "		'home': {                                   ";
    script += "			'team': resultTable[1].innerText,       ";
    script += "			'Q1': resultTable[2].innerText,         ";
    script += "			'Q2': resultTable[3].innerText,         ";
    script += "			'Q3': resultTable[4].innerText,         ";
    script += "			'Q4': resultTable[5].innerText,         ";
    script += "			'QT1': resultTable[6].innerText,        ";
    script += "			'Final': resultTable[7].innerText       ";
    script += "		},                                          ";
    script += "		'away': {                                   ";
    script += "			'team': resultTable[9].innerText,       ";
    script += "			'Q1': resultTable[10].innerText,        ";
    script += "			'Q2': resultTable[11].innerText,        ";
    script += "			'Q3': resultTable[12].innerText,        ";
    script += "			'Q4': resultTable[13].innerText,        ";
    script += "			'OT1': resultTable[14].innerText,       ";
    script += "			'Final': resultTable[15].innerText      ";
    script += "		}                                           ";
    script += "	};                                              ";
    script += "}else if(resultTable.length == 18){                 ";
    script += "	var result = {                                  ";
    script += "		'home': {                                   ";
    script += "			'team': resultTable[1].innerText,       ";
    script += "			'Q1': resultTable[2].innerText,         ";
    script += "			'Q2': resultTable[3].innerText,         ";
    script += "			'Q3': resultTable[4].innerText,         ";
    script += "			'Q4': resultTable[5].innerText,         ";
    script += "			'QT1': resultTable[6].innerText,        ";
    script += "			'QT2': resultTable[7].innerText,        ";
    script += "			'Final': resultTable[8].innerText       ";
    script += "		},                                          ";
    script += "		'away': {                                   ";
    script += "			'team': resultTable[10].innerText,      ";
    script += "			'Q1': resultTable[11].innerText,        ";
    script += "			'Q2': resultTable[12].innerText,        ";
    script += "			'Q3': resultTable[13].innerText,        ";
    script += "			'Q4': resultTable[14].innerText,        ";
    script += "			'OT1': resultTable[15].innerText,       ";
    script += "			'OT2': resultTable[16].innerText,       ";
    script += "			'Final': resultTable[17].innerText      ";
    script += "		}                                           ";
    script += "	};                                              ";
    script += "}                                                ";
    script += "return JSON.stringify(result);                   ";
    return script;

}

async function JSgetTableDetails(tableId) {
    var script = "var data = document.getElementById('" + tableId + "').querySelectorAll('[data-row]');";
    script += "if(data.length == 0) { data = document.getElementById('" + tableId + "').getElementsByTagName('tr');}";
    script += "var allData = [];";
    script += "for (let index = 0; index < data.length; index++) {";
    script += "	let dataStatValues = new Set();";
    script += "    const dataRow = data[index];";
    script += "	dataRow.querySelectorAll('[data-stat]').forEach(child => {";
    script += "    let dataStat = child.getAttribute('data-stat');";
    script += "    if (dataStat) {";
    script += "        dataStatValues.add(dataStat);		";
    script += "    }";
    script += "	});";
    script += "	let uniqueDataStatArray = Array.from(dataStatValues);";
    script += "	allData.push(await GetDataPointsFromTable(uniqueDataStatArray, dataRow));";
    script += "}";
    script += "return JSON.stringify(allData);";
    script += "async function GetDataPointsFromTable(uniqueDataStatArray, dataRow)";
    script += "{";
    script += "	var dataPoint = {};";
    script += "	for (let sd = 0; sd < uniqueDataStatArray.length; sd++) {";
    script += "		var dataDetail = dataRow.querySelector('[data-stat=\"'+uniqueDataStatArray[sd]+'\"]');";
    script += "		if(dataDetail)";
    script += "		{";
    script += "			dataPoint[uniqueDataStatArray[sd]] = dataDetail.innerText;";
    script += "			if(dataDetail.querySelector('a'))";
    script += "			{";
    script += "				dataPoint[uniqueDataStatArray[sd]+'Link'] = dataDetail.querySelector('a').getAttribute('href');";
    script += "			}";
    script += "		}";
    script += "	}";
    script += "	return dataPoint;";
    script += "}";
    console.log(script);
    return script;

}