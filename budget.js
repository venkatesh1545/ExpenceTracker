document.addEventListener("DOMContentLoaded", function() {
    const balanceEl = document.querySelector(".balance .value");
    const incomeTotalEl = document.querySelector(".income-total");
    const outcomeTotalEl = document.querySelector(".outcome-total");
    const expenseListEl = document.querySelector("#expense .list");
    const incomeListEl = document.querySelector("#income .list");
    const allListEl = document.querySelector("#all .list");

    const expenseTitleInput = document.querySelector("#expense-title-input");
    const expenseAmountInput = document.querySelector("#expense-amount-input");
    const addExpenseBtn = document.querySelector(".add-expense");

    const incomeTitleInput = document.querySelector("#income-title-input");
    const incomeAmountInput = document.querySelector("#income-amount-input");
    const addIncomeBtn = document.querySelector(".add-income");

    const downloadBtn = document.querySelector("#download-btn");
    const deleteAllButton = document.getElementById("delete-all-btn");

    let ENTRY_LIST = [];
    let balance = 0, income = 0, outcome = 0;
    const tableName = 'signinpage';  // Replace with your actual table name

    // Handle adding expenses
    addExpenseBtn.addEventListener("click", function() {
        const expense = {
            type: "expense",
            title: expenseTitleInput.value,
            amount: parseInt(expenseAmountInput.value)
        };
        if (expense.title && expense.amount) {  // Validate inputs
            ENTRY_LIST.push(expense);
            updateUI();
            clearInput([expenseTitleInput, expenseAmountInput]);
            saveTransaction(expense);
        } else {
            alert("Please enter both title and amount.");
        }
    });

    // Handle adding income
    addIncomeBtn.addEventListener("click", function() {
        const income = {
            type: "income",
            title: incomeTitleInput.value,
            amount: parseInt(incomeAmountInput.value)
        };
        if (income.title && income.amount) {  // Validate inputs
            ENTRY_LIST.push(income);
            updateUI();
            clearInput([incomeTitleInput, incomeAmountInput]);
            saveTransaction(income);
        } else {
            alert("Please enter both title and amount.");
        }
    });

    // Handle downloading data
    downloadBtn.addEventListener("click", function() {
        const data = ENTRY_LIST.map(entry => ({
            type: entry.type,
            title: entry.title,
            amount: entry.amount
        }));

        const userInput = prompt("Enter '1' to export as PDF or '2' to export as Excel:");

        if (userInput === '1') {
            exportPDF(data);
        } else if (userInput === '2') {
            exportExcel(data);
        } else {
            alert("Couldn't generate file");
        }
    });

    // Handle deleting all transactions
    if (deleteAllButton) {
        deleteAllButton.addEventListener("click", function() {
            if (confirm("Are you sure you want to delete all transactions?")) {
                deleteAllTransactions();
            }
        });
    }

    function updateUI() {
        income = calculateTotal("income", ENTRY_LIST);
        outcome = calculateTotal("expense", ENTRY_LIST);
        balance = calculateBalance(income, outcome);

        balanceEl.innerHTML = `₹${balance}`;
        incomeTotalEl.innerHTML = `₹${income}`;
        outcomeTotalEl.innerHTML = `₹${outcome}`;

        clearElement([expenseListEl, incomeListEl, allListEl]);

        ENTRY_LIST.forEach((entry, index) => {
            if (entry.type === "expense") {
                showEntry(expenseListEl, entry.type, entry.title, entry.amount, index);
            } else if (entry.type === "income") {
                showEntry(incomeListEl, entry.type, entry.title, entry.amount, index);
            }
            showEntry(allListEl, entry.type, entry.title, entry.amount, index);
        });
    }

    function showEntry(list, type, title, amount, id) {
        const entry = `<li id="${id}" class="${type}">
                            <div class="entry">${title}: ₹${amount}</div>
                            <div class="edit" onclick="editEntry(${id})">✏️</div>
                            <div class="delete" onclick="deleteEntry(${id})">🗑️</div>
                       </li>`;
        const position = "afterbegin";
        list.insertAdjacentHTML(position, entry);
    }

    function clearElement(elements) {
        elements.forEach(element => {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        });
    }

    function clearInput(inputs) {
        inputs.forEach(input => {
            input.value = "";
        });
    }

    function calculateTotal(type, list) {
        let sum = 0;
        list.forEach(entry => {
            if (entry.type === type) {
                sum += entry.amount;
            }
        });
        return sum;
    }

    function calculateBalance(income, outcome) {
        return income - outcome;
    }

    function saveTransaction(transaction) {
        const userName = localStorage.getItem('userName');
        const params = {
            TableName: tableName,
            Item: {
                username: userName,
                title: transaction.title,
                amount: transaction.amount,
                type: transaction.type
            }
        };

        docClient.put(params, function(err, data) {
            if (err) {
                console.error("Unable to add transaction. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Transaction added:", JSON.stringify(data, null, 2));
            }
        });
    }

    function loadTransactions() {
        const userName = localStorage.getItem('userName');
        const params = {
            TableName: tableName,
            KeyConditionExpression: "#user = :user",
            ExpressionAttributeNames: {
                "#user": "username"
            },
            ExpressionAttributeValues: {
                ":user": userName
            }
        };

        docClient.query(params, function(err, data) {
            if (err) {
                console.error("Unable to read items. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                data.Items.forEach(transaction => {
                    ENTRY_LIST.push(transaction);
                });
                updateUI();
            }
        });
    }

    function deleteAllTransactions() {
        const userName = localStorage.getItem('userName');
        const params = {
            TableName: tableName,
            KeyConditionExpression: "#user = :user",
            ExpressionAttributeNames: {
                "#user": "username"
            },
            ExpressionAttributeValues: {
                ":user": userName
            }
        };

        docClient.query(params, function(err, data) {
            if (err) {
                console.error("Unable to read items. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                const deleteRequests = data.Items.map(item => ({
                    DeleteRequest: {
                        Key: {
                            username: userName,
                            title: item.title
                        }
                    }
                }));
                
                const deleteParams = {
                    RequestItems: {
                        [tableName]: deleteRequests
                    }
                };
                
                docClient.batchWrite(deleteParams, function(err, data) {
                    if (err) {
                        console.error("Unable to delete items. Error JSON:", JSON.stringify(err, null, 2));
                    } else {
                        console.log("All transactions deleted:", JSON.stringify(data, null, 2));
                        // Clear UI after deletion
                        ENTRY_LIST = [];
                        updateUI();
                    }
                });
            }
        });
    }

    function exportPDF(data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 10;
        doc.text('Transaction History', 10, y);
        y += 10;
        data.forEach(item => {
            doc.text(`${item.type.toUpperCase()}: ${item.title} - ₹${item.amount}`, 10, y);
            y += 10;
        });
        doc.save('transaction-history.pdf');
    }

    function exportExcel(data) {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
        XLSX.writeFile(wb, 'transaction-history.xlsx');
    }

    // Handle tab switching
    document.querySelector(".toggle").addEventListener("click", function(event) {
        if (event.target.classList.contains("tab1")) {
            switchTab("#all");
        } else if (event.target.classList.contains("tab2")) {
            switchTab("#income");
        } else if (event.target.classList.contains("tab3")) {
            switchTab("#expense");
        }
    });

    function switchTab(tabId) {
        const sections = document.querySelectorAll(".budget-dashboard > div");
        const tabs = document.querySelectorAll(".toggle > div");
    
        sections.forEach(section => {
            if (section.id === tabId.substring(1)) {
                section.classList.add("active");
            } else {
                section.classList.remove("active");
            }
        });
    
        tabs.forEach(tab => {
            if (tab.getAttribute("data-tab") === tabId.substring(1)) {
                tab.classList.add("active");
            } else {
                tab.classList.remove("active");
            }
        });
    }
    

    window.deleteEntry = function(entryID) {
        ENTRY_LIST.splice(entryID, 1);
        updateUI();
    };

    window.editEntry = function(entryID) {
        const entry = ENTRY_LIST[entryID];
        const newTitle = prompt("Enter new title:", entry.title);
        const newAmount = prompt("Enter new amount:", entry.amount);
        if (newTitle && newAmount && !isNaN(newAmount)) {
            ENTRY_LIST[entryID] = { ...entry, title: newTitle, amount: parseInt(newAmount) };
            updateUI();
        } else {
            alert("Invalid input. Please enter both a valid title and amount.");
        }
    };

    // Load transactions on page load
    loadTransactions();
});
