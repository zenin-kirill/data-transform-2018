(function() {
    angular.module('starterApp').config(['$compileProvider', function($compileProvider) {
        // регистрация списка “безопасных” префиксов приложения
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(|blob|):/);
    }]);

    // Модуль транформации данных разработанный под платформу AngularJS
    angular.module('starterApp').controller('TransformController', TransformController);

    // Подключение внутренних сервисов AngularJS
    TransformController.$inject = ['$scope', '$timeout', '$window'];

    // Функция контроллер для трансформации данных
    function TransformController($scope, $timeout, $window) {
        $scope.inputFile = null;        // входой файл
        $scope.additionalFile = null;   // дополнительный файл (доп. знаний)
        $scope.knowleges = null;        // сами доп. знания
        $scope.knowlegesNumber = 0;     // количество доп. знаний
        $scope.outFileName = '';        // имя выходного файла
        $scope.loadReady = false;       // загрузка завершена

        // Был загружен входной файл
        $scope.fileNameInputChanged = function(e) {
            $scope.inputFile = e.files[0];
            $scope.outFileName = $scope.inputFile.name + '-out.txt';
            $scope.loadReady = false;
        }

        // Был загружен доп. файл
        $scope.fileNameAdditionalChanged = function(e) {
            $scope.additionalFile = e.files[0];
            $scope.loadReady = false;
        }

        //Функция первого этапа трансорфмации
        $scope.transformStart = function() {
            $scope.loadReady = false;
            $scope.allProgress = 0;

            $scope.outFileText = '';    // содержимое выходного файла

            var inputReader = new FileReader();
            var additionalReader = new FileReader();

            additionalReader.readAsText($scope.additionalFile);

            // после загрузки текста из доп. файла
            additionalReader.onload = function() {

                // рабор строк знаний
                $scope.knowleges = additionalReader.result.split("\n");
                _.forEach($scope.knowleges, function(value, i) {
                    $scope.knowleges[i] = value.split('\t');
                })

                // определение коилчества знаний (стообцов)
                if ($scope.knowleges && $scope.knowleges[0] && $scope.knowleges[0].length)
                    $scope.knowlegesNumber = $scope.knowleges[0].length;
                else {
                    $scope.knowlegesNumber = 0;
                }

                inputReader.readAsText($scope.inputFile);

                // после загрузки текста из основного файла
                inputReader.onload = function() {
                    // создание массива строк исходного файла (HEX)
                    var hexStringArray = inputReader.result.split("\n");

                    $timeout(function() {$scope.allProgress = 5});
                    $timeout(function() {operation1(hexStringArray)}, 500);
                };
            };
        };

        // функция преобразования HEX => strings
        function operation1(hexStringArray) {
            var monoString = '';   // цельный текст в фомате ASCII

            _.forEach(hexStringArray, function(value, i) {
                // удаление сервисной информации
                hexStringArray[i] = value.substr(36);

                var hexArray = hexStringArray[i].split(' ');

                // HEX => ASCII
                _.forEach(hexArray, function(value) {
                    if (value !== '00' && value !== '')
                        monoString += String.fromCharCode(parseInt(value, 16));
                })
            })

            var stringsArray = monoString.split('\n');

            $timeout(function() {$scope.allProgress = 40});
            $timeout(function() {operation2(stringsArray)}, 500);
        }

        // strings => string table + knowledge
        function operation2(stringsArray) {
            var initDateTime = moment($scope.inputFile.name, 'DD.MM.YY-HH:mm:ss'); // время начала измерений
            var currentDateTime = null;     // инкрементируемое время
            var lastSec = null;             // указатель на последнюю использованную секунду
            var currSec = null;             // указатель на ткущую исопльзуему в выч. секунду
            var currentKnowledge = null;    // указатель на текущее знание
            var dataType = null;            //time, irs, rs, srs
            var stringTable = [];
            var pIndex = 0;

            // инциализация таблицы заголовком
            stringTable[0] = ['time', 'pi', 'irs', 'rs', 'srs'];
            var sequence = [];  // последовательность
            var rowsIndex = 1;  // указатель на тк. номер строки
            var tempIndex = 0;  // указатель на временно хранимый индекс
            var index = 0;      // общий индекс
            var isTimeStarted = false;

            // вспомогат. переменные для записи srs
            var srsNum = 0;
            var srsInd = 0;

            if ($scope.knowlegesNumber) {
                // инициализация заголовков знаний
                _.forEach($scope.knowleges[0], function(knowlegeHeader, i) {
                    if (i > 0) {
                        stringTable[0][i + 4] = knowlegeHeader;
                    }
                })
            }

            _.forEach(stringsArray, function(value, i) {
                switch (value) {
                    case '[time]':
                        isTimeStarted = true;
                        sequence = [];
                        dataType = 'time';
                        sequence.push(dataType);
                        pIndex++;
                        tempIndex = rowsIndex;
                        break;

                    case '[irs]':
                        if (!~sequence.indexOf('irs') && isTimeStarted) {
                            dataType = 'irs';
                            sequence.push(dataType);
                            index = tempIndex;
                        } else {
                            dataType = null;
                        }
                        break;

                    case '[rs]':
                        if (!~sequence.indexOf('rs') && isTimeStarted) {
                            dataType = 'rs';
                            sequence.push(dataType);
                            index = tempIndex;
                        } else {
                            dataType = null;
                        }
                        break;

                    case '[srs]':
                        if (!~sequence.indexOf('srs') && isTimeStarted) {
                            dataType = 'srs';
                            srsNum = 0;
                            sequence.push(dataType);
                            index = tempIndex;
                        } else {
                            dataType = null;
                        }
                        break;

                    default:
                        if (!isTimeStarted) {
                            dataType = null;
                            return;
                        }

                        switch (dataType) {
                            case 'time':
                                // вычисление данных о времени
                                if (!currentDateTime) {
                                    currentDateTime = moment(initDateTime).add(parseInt(value), 's');
                                    currSec = parseInt(value);
                                } else {
                                    lastSec = currSec
                                    currSec = parseInt(value);
                                    if (lastSec > currSec) {
                                        currentDateTime = moment(currentDateTime).add(15, 's');
                                    } else {
                                        currentDateTime = moment(currentDateTime).add(currSec - lastSec, 's');
                                    }
                                }

                                // выборка знаний, совпадающих по времени с тек. измерением
                                if ($scope.knowlegesNumber) {
                                    _.forEach($scope.knowleges, function(knowlegeArray, i) {
                                        if (moment(knowlegeArray[0], 'DD.MM.YY-HH:mm:ss').format('DD.MM.YY-HH:mm') ===
                                            moment(currentDateTime).format('DD.MM.YY-HH:mm'))

                                            currentKnowledge = knowlegeArray;
                                    })
                                }
                                break;

                            case 'irs':
                                // добавление данных ir и времени
                                stringTable[index] = [];
                                stringTable[index][0] = moment(currentDateTime).format('DD.MM.YY-HH:mm:ss');
                                stringTable[index][1] = pIndex.toString();
                                stringTable[index][2] = value;

                                // добавление данных знаний
                                if ($scope.knowlegesNumber) {
                                    for (var k = 1; k < $scope.knowlegesNumber; k++) {
                                        stringTable[index][k + 4] = currentKnowledge[k]; // k+4 - начиная с 5
                                    }
                                }

                                index++;
                                rowsIndex++;
                                break;
                            case 'rs':
                                // добавление данных irs
                                if (stringTable[index]) {
                                    stringTable[index][3] = value;
                                    index++;
                                }
                                break;
                            case 'srs':
                                if (stringTable[index]) {
                                    // добавление данных srs (заполнением)
                                    if (srsNum === 0)
                                        srsInd = index;

                                    if (srsNum < 8) {
                                        for (var z = 0; z < 64; z++) { // 512 по 64 на 8
                                            if (stringTable[srsInd + (srsNum * 64) + z]) {
                                                stringTable[srsInd + (srsNum * 64) + z][4] = value;
                                            }
                                        }
                                    }

                                    index++;
                                    srsNum++;
                                }
                                break;
                        }
                }
            })

            $timeout(function() {$scope.allProgress = 70});
            $timeout(function() {operation3(stringTable)}, 500);
        }

        // string-table => text array => txt file
        function operation3(stringTable) {

            _.forEach(stringTable, function(row, i) {

                // очистка строк с недостающими данными
                if (!row[2] || !row[3] || !row[4])
                    delete stringTable[i]
                else
                    stringTable[i] = _.join(row, '\t');
            })

            var i = 0;
            do {
                if (!stringTable[i] || stringTable[i] === ' ') stringTable.splice(i, 1);
                else i++;
            } while (i < stringTable.length);
            console.log('Всего строк: ' + stringTable.length);

            stringTable = _.join(stringTable, '\n')

            // генерация нового файл и создание ссылки на него
            var blob = new Blob([stringTable], {type: 'text/plain'});
            var url = $window.URL || $window.webkitURL;
            $scope.fileUrl = url.createObjectURL(blob);

            $timeout(function() {$scope.allProgress = 100});
            $scope.loadReady = true;
        }
    }
})()
