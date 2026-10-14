package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "strconv"

    _ "modernc.org/sqlite"
)

type Product struct {
    ID          int    `json:"id"`
    Name        string `json:"name"`
    Price       int    `json:"price"`
    Description string `json:"description,omitempty"`
    Image       string `json:"image,omitempty"`
}

type OrderRequest struct {
    ProductID int `json:"product_id"`
    Quantity  int `json:"quantity"`
}

var db *sql.DB

func main() {
    var err error
    db, err = sql.Open("sqlite", "./ec.db")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    if err = initDB(); err != nil {
        log.Fatal(err)
    }

    http.HandleFunc("/api/products", getProductsHandler)
    http.HandleFunc("/api/products/detail", getProductDetailHandler)
    http.HandleFunc("/api/product", getProductDetailHandler)
    http.HandleFunc("/api/orders", createOrderHandler)

    fs := http.FileServer(http.Dir("./static"))
    http.Handle("/", fs)

    port := os.Getenv("PORT")
    if port == "" {
        port = "8081"
    }
    addr := ":" + port
    fmt.Printf("EC Shop server running on http://localhost:%s\n", port)
    if err := http.ListenAndServe(addr, nil); err != nil {
        log.Fatal(err)
    }
}

func initDB() error {
    createProductsTable := `
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        description TEXT DEFAULT '',
        image TEXT DEFAULT ''
    );`
    if _, err := db.Exec(createProductsTable); err != nil {
        return fmt.Errorf("failed to create products table: %w", err)
    }

    if err := ensureProductColumns(); err != nil {
        return err
    }

    createOrdersTable := `
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
    if _, err := db.Exec(createOrdersTable); err != nil {
        return fmt.Errorf("failed to create orders table: %w", err)
    }

    var count int
    if err := db.QueryRow("SELECT COUNT(*) FROM products").Scan(&count); err != nil {
        return fmt.Errorf("failed to count products: %w", err)
    }

    if count == 0 {
        insertQuery := `INSERT INTO products (name, price, description, image) VALUES 
            ('Laptop', 120000, 'Thin and lightweight laptop for work and study.', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80'),
            ('Wireless Mouse', 3500, 'Comfortable wireless mouse with precise tracking.', 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=80'),
            ('USB Memory 64GB', 1200, 'Compact and durable USB flash drive for daily backup.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80');`
        if _, err := db.Exec(insertQuery); err != nil {
            return fmt.Errorf("failed to insert seed products: %w", err)
        }
    } else {
        updateQuery := `UPDATE products
            SET description = CASE id
                WHEN 1 THEN 'Thin and lightweight laptop for work and study.'
                WHEN 2 THEN 'Comfortable wireless mouse with precise tracking.'
                WHEN 3 THEN 'Compact and durable USB flash drive for daily backup.'
                ELSE description
            END,
            image = CASE id
                WHEN 1 THEN 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80'
                WHEN 2 THEN 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=80'
                WHEN 3 THEN 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80'
                ELSE image
            END
            WHERE id IN (1,2,3)`
        if _, err := db.Exec(updateQuery); err != nil {
            return fmt.Errorf("failed to update product metadata: %w", err)
        }
    }

    return nil
}

func ensureProductColumns() error {
    columns, err := db.Query("PRAGMA table_info(products)")
    if err != nil {
        return fmt.Errorf("failed to read product schema: %w", err)
    }
    defer columns.Close()

    seenDescription := false
    seenImage := false

    for columns.Next() {
        var cid int
        var name string
        var dataType string
        var notNull int
        var defaultValue sql.NullString
        var pk int
        if err := columns.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &pk); err != nil {
            return fmt.Errorf("failed to inspect product schema: %w", err)
        }
        if name == "description" {
            seenDescription = true
        }
        if name == "image" {
            seenImage = true
        }
    }

    if !seenDescription {
        if _, err = db.Exec("ALTER TABLE products ADD COLUMN description TEXT DEFAULT ''"); err != nil {
            return fmt.Errorf("failed to add description column: %w", err)
        }
    }
    if !seenImage {
        if _, err = db.Exec("ALTER TABLE products ADD COLUMN image TEXT DEFAULT ''"); err != nil {
            return fmt.Errorf("failed to add image column: %w", err)
        }
    }
    return nil
}

func getProductsHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    rows, err := db.Query("SELECT id, name, price, COALESCE(description, ''), COALESCE(image, '') FROM products ORDER BY id")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    var products []Product
    for rows.Next() {
        var p Product
        if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Description, &p.Image); err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        products = append(products, p)
    }

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(products); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
}

func getProductDetailHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    idStr := r.URL.Query().Get("id")
    if idStr == "" {
        http.Error(w, "Missing id parameter", http.StatusBadRequest)
        return
    }

    id, err := strconv.Atoi(idStr)
    if err != nil || id <= 0 {
        http.Error(w, "Invalid id parameter", http.StatusBadRequest)
        return
    }

    var p Product
    err = db.QueryRow("SELECT id, name, price, COALESCE(description, ''), COALESCE(image, '') FROM products WHERE id = ?", id).Scan(&p.ID, &p.Name, &p.Price, &p.Description, &p.Image)
    if err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "Product not found", http.StatusNotFound)
            return
        }
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(p); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
}

func createOrderHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var req OrderRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid input", http.StatusBadRequest)
        return
    }

    if req.ProductID <= 0 || req.Quantity <= 0 {
        http.Error(w, "Invalid product_id or quantity", http.StatusBadRequest)
        return
    }

    var exists bool
    if err := db.QueryRow("SELECT 1 FROM products WHERE id = ?", req.ProductID).Scan(&exists); err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "Product not found", http.StatusNotFound)
            return
        }
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    stmt, err := db.Prepare("INSERT INTO orders (product_id, quantity) VALUES (?, ?)")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer stmt.Close()

    if _, err = stmt.Exec(req.ProductID, req.Quantity); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    if err := json.NewEncoder(w).Encode(map[string]string{"message": "Order placed successfully"}); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
}
