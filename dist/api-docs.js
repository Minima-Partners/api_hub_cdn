    console.log('start iframes detection');
    const iframes = document.querySelectorAll('iframe');

    // Display detected iframes
    if (iframes.length > 0) {
        console.log('Detected iframes:', iframes);
        iframes.forEach((iframe, index) => {
            const iframeInfo = `Iframe ${index + 1}: ${iframe.src || 'No src attribute'}`;
            const infoElement = document.createElement('p');
            infoElement.textContent = iframeInfo;
            document.body.appendChild(infoElement); // Display iframe info on the page
        });
    } else {
        console.log('No iframes detected.');
    }

    function loadExternalScripts(scripts, callback) {
        let loadedScripts = 0;
        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loadedScripts++;
                if (loadedScripts === scripts.length && typeof callback === 'function') {
                    callback();
                }
            };
            document.head.appendChild(script);
        });
    }   


        // Load external scripts first
        loadExternalScripts([
            'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.0/beautify.min.js',
            'https://cdn.jsdelivr.net/npm/file-saver'
        ], initializeAPIContainers);

    function initializeAPIContainers() {
        const apiContainers = document.querySelectorAll('.api-container');

        apiContainers.forEach(container => {
            console.log('setupEventHandlers');
            setupEventHandlers(container);
        });
    }

    function setupEventHandlers(container) {
        const overlay = container.querySelector('.overlay');
        const popupCode = container.querySelector('.popup-code');
        const popupExport = container.querySelector('.popup-export');
        const btnCloseCode = container.querySelector('.btn-close-code');
        const tabButtons = container.querySelectorAll('.tab-button');
        const tabContents = container.querySelectorAll('.tab-content');
        const btnCopyCode = popupCode.querySelector('.btn-copy-code');
        const btnCopyResponse = container.querySelector('.btn-copy-response');
        const btnGenerate = container.querySelector('.btn-code');
        const btnExport = container.querySelector('.btn-export');
        const btnSendRequest = container.querySelector('.btn-request');
        const responseContent = container.querySelector('.response-content pre');
        const btnExportCSV = container.querySelector('.btn-export-csv');
        const btnExportJSON = container.querySelector('.btn-export-json');
        const btnExportTEXT = container.querySelector('.btn-export-text');

        btnGenerate.addEventListener('click', () => handleGenerateButton(container, popupCode, overlay));
        btnExport.addEventListener('click', () => showElement(popupExport, overlay));
        btnSendRequest.addEventListener('click', () => handleTryButtonClick(container, responseContent));
        btnCloseCode.addEventListener('click', () => hideElement(popupCode, overlay));
        overlay.addEventListener('click', () => hideElement(popupCode, popupExport, overlay));

        btnCopyCode.addEventListener('click', () => handleCopyCode(btnCopyCode, container));
        btnCopyResponse.addEventListener('click', () => handleCopyResponse(btnCopyResponse, container));
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => handleTabSwitch(button, container, tabButtons, tabContents));
        });

        btnExportCSV.addEventListener('click', () => handleExport('csv', responseContent));
        btnExportJSON.addEventListener('click', () => handleExport('json', responseContent));
        btnExportTEXT.addEventListener('click', () => handleExport('text', responseContent));
    }

    // Function to construct the curl command based on parameters
    function generateCurlCommand(endpoint, queryParams, bodyParams) {
        let queryString = Object.keys(queryParams)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
            .join('&');
        let curlCommand = `curl "${endpoint}?${queryString}"`;
        if (bodyParams && Object.keys(bodyParams).length > 0) {
            curlCommand += ` -d "${JSON.stringify(bodyParams)}"`;
        }
        return curlCommand;
    }

    // Function to convert code to specified languages using the API
    async function convertCode(code, selectedLang) {
        const url = 'http://localhost:3100/api/convert';
        const escapedCode = code;
        const results = {};

        async function makeRequest(language) {
            const payload = {
                code: escapedCode,
                language: language
            };
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                const beautifiedCode = js_beautify(result.outputCode[0], { indent_size: 2 });
                results[language] = beautifiedCode;
            } catch (error) {
                results[language] = `Error: ${error.message}`;
            }
        }

        await Promise.all([
            makeRequest(selectedLang),
        ]);

        return results;
    }

    function handleGenerateButton(container, popupCode, overlay) {
    console.log('handleGenerateButton');
    const endpoint = container.querySelector('.api-endpoint').textContent.trim().split(' ')[1];
    console.log('endpoint ', endpoint);
    const { queryParams, bodyParams } = parseParams(container);
    console.log('queryParams ', queryParams);

    const curlCommand = generateCurlCommand(endpoint, queryParams, bodyParams);
    console.log('curlCommand ', curlCommand);

    // Set the curl command to the Shell tab content
    container.querySelector('.code-content-shell .code-content').textContent = curlCommand;
    
    // Activate the Shell tab
    const tabButtons = container.querySelectorAll('.tab-button');
    const tabContents = container.querySelectorAll('.tab-content');
    
    console.log('tabButtons ', tabButtons);
    console.log('tabContents ', tabContents);

    // Remove 'active' class from all tabs and contents
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Add 'active' class to the Shell tab and content
    container.querySelector('.tab-button[data-tab="shell"]').classList.add('active');
    container.querySelector('.code-content-shell').classList.add('active');

    // Show the popup
    showElement(popupCode, overlay);
    }


    function handleTabSwitch(button, container, tabButtons, tabContents) {
    const selectedLang = button.dataset.tab;
    const curlCommand = container.querySelector('.code-content-shell .code-content').textContent;

    if (selectedLang === 'shell') {
        container.querySelector('.code-content-shell .code-content').textContent = curlCommand;
    } else {
        convertCode(curlCommand, selectedLang).then(results => {
            container.querySelector(`.code-content-${selectedLang} .code-content`).textContent = results[selectedLang];
        });
    }

    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    button.classList.add('active');
    container.querySelector(`.code-content-${selectedLang}`).classList.add('active');
    }

    function handleCopyCode(btnCopyCode, container) {
    const activeTab = container.querySelector('.tab-content.active .code-content');
    navigator.clipboard.writeText(activeTab.textContent).then(() => {
        showTick(btnCopyCode);
    });
    }


    function handleTryButtonClick(container, responseContent) {
        const endpoint = 'https://financialmodelingprep.com/api/v3/search';
        const { queryParams, bodyParams } = parseParams(container);
        const queryString = Object.keys(queryParams)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
            .join('&');
        const url = `${endpoint}?${queryString}`;

        showLoadingIndicator(responseContent);

        fetch(url, { method: 'GET' })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(result => {
                displayResponse(responseContent, result);
            })
            .catch(error => {
                responseContent.textContent = `Error: ${error.message}`;
            });
    }

    function handleCopyResponse(btnCopyResponse, container) {
        const jsonContent = container.querySelector('.json-content');
        navigator.clipboard.writeText(jsonContent.textContent).then(() => {
            showTick(btnCopyResponse);
        });
    }

    function handleExport(format, responseContent) {
        const content = responseContent.textContent;
        let convertedContent;

        switch (format) {
            case 'csv':
                convertedContent = convertToCSV(content);
                downloadFile(convertedContent, 'response.csv', 'text/csv');
                break;
            case 'json':
                downloadFile(content, 'response.json', 'application/json');
                break;
            case 'text':
                downloadFile(content, 'response.txt', 'text/plain');
                break;
        }
    }

    function parseParams(container) {
        const queryParams = {};
        const bodyParams = {};

        const queryTable = container.querySelector('.query-params table');
        if (queryTable) extractParams(queryTable, queryParams);

        const bodyTable = container.querySelector('.body-params table');
        if (bodyTable) extractParams(bodyTable, bodyParams);

        return { queryParams, bodyParams };
    }

    function extractParams(table, params) {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (index > 0) {
                const cells = row.querySelectorAll('td');
                params[cells[0].textContent.trim()] = cells[2].textContent.trim();
            }
        });
    }

    function showElement(...elements) {
        console.log('show_elements ', tabContents);
        elements.forEach(element => element.classList.add('show_elements'));
    }

    function hideElement(...elements) {
        elements.forEach(element => element.classList.remove('show_elements'));
    }

    function showTick(button) {
        const tick = button.nextElementSibling;
        tick.style.display = 'block';
        setTimeout(() => {
            tick.style.display = 'none';
        }, 2000);
    }

    function showLoadingIndicator(responseContent) {
        responseContent.innerHTML = '<div class="sk-circle"><div class="sk-circle1 sk-child"></div><div class="sk-circle2 sk-child"></div><div class="sk-circle3 sk-child"></div><div class="sk-circle4 sk-child"></div><div class="sk-circle5 sk-child"></div><div class="sk-circle6 sk-child"></div><div class="sk-circle7 sk-child"></div><div class="sk-circle8 sk-child"></div><div class="sk-circle9 sk-child"></div><div class="sk-circle10 sk-child"></div><div class="sk-circle11 sk-child"></div><div class="sk-circle12 sk-child"></div></div>';
    }

    function displayResponse(responseContent, result) {
        const beautifiedResponse = js_beautify(JSON.stringify(result), { indent_size: 2 });
        responseContent.innerHTML = `<pre style="text-align: left;"><code class="token">${beautifiedResponse}</code></pre>`;
    }

    function convertToCSV(data) {
        // Assuming data is JSON formatted string
        let csv = '';
        const jsonArray = JSON.parse(data);
        const keys = Object.keys(jsonArray[0]);
        csv += keys.join(',') + '\n';
        jsonArray.forEach(item => {
            const values = keys.map(key => item[key]);
            csv += values.join(',') + '\n';
        });
        return csv;
    }

    function downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        saveAs(blob, fileName);
    }
