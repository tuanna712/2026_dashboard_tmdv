import csv
import os
from pathlib import Path

import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values


def load_env_file(env_path: Path) -> None:
    """Load KEY=VALUE pairs from a local .env file into os.environ."""
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def get_connection():
    script_dir = Path(__file__).resolve().parent
    load_env_file(script_dir / ".env")

    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        dbname=os.getenv("DB_NAME"),
    )


def get_table_columns(cursor, table_name: str) -> list[str]:
    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position;
        """,
        (table_name,),
    )
    return [row[0] for row in cursor.fetchall()]


def get_fk_dependencies(cursor, table_names: list[str]) -> dict[str, set[str]]:
    table_set = set(table_names)
    deps: dict[str, set[str]] = {name: set() for name in table_names}

    cursor.execute(
        """
        SELECT
            tc.table_name AS child_table,
            ccu.table_name AS parent_table
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public';
        """
    )

    for child_table, parent_table in cursor.fetchall():
        if child_table in table_set and parent_table in table_set and child_table != parent_table:
            deps[child_table].add(parent_table)

    return deps


def topo_sort_tables(table_names: list[str], deps: dict[str, set[str]]) -> list[str]:
    pending = {name: set(deps.get(name, set())) for name in table_names}
    ordered: list[str] = []

    while pending:
        ready = sorted([name for name, needed in pending.items() if not needed])
        if not ready:
            # Break potential cycles deterministically.
            ordered.extend(sorted(pending.keys()))
            break

        for name in ready:
            ordered.append(name)
            pending.pop(name, None)
        for needed in pending.values():
            needed.difference_update(ready)

    return ordered


def read_csv_rows(csv_path: Path) -> tuple[list[str], list[tuple]]:
    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        if not reader.fieldnames:
            raise ValueError(f"CSV has no header: {csv_path.name}")

        columns = [col.strip() for col in reader.fieldnames]
        rows = []
        for row in reader:
            cleaned = []
            for col in columns:
                value = row.get(col)
                if value is None:
                    cleaned.append(None)
                    continue
                text = value.strip()
                cleaned.append(text if text != "" else None)
            rows.append(tuple(cleaned))

    return columns, rows


def import_csv_to_table(cursor, table_name: str, csv_path: Path) -> int:
    table_columns = get_table_columns(cursor, table_name)
    if not table_columns:
        raise ValueError(f"Table '{table_name}' does not exist in database.")

    csv_columns, rows = read_csv_rows(csv_path)
    unknown_columns = [c for c in csv_columns if c not in table_columns]
    if unknown_columns:
        raise ValueError(
            f"{csv_path.name} has unknown columns for table '{table_name}': "
            + ", ".join(unknown_columns)
        )

    if not rows:
        return 0

    insert_sql = sql.SQL(
        "INSERT INTO {table} ({columns}) VALUES %s ON CONFLICT DO NOTHING"
    ).format(
        table=sql.Identifier(table_name),
        columns=sql.SQL(", ").join(sql.Identifier(col) for col in csv_columns),
    )

    execute_values(cursor, insert_sql, rows, page_size=500)
    return len(rows)


def import_initial_data():
    script_dir = Path(__file__).resolve().parent
    csv_dir = script_dir / "csv"
    if not csv_dir.exists():
        raise FileNotFoundError(f"CSV folder not found: {csv_dir}")

    conn = get_connection()
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            imported_total = 0
            csv_files = sorted(csv_dir.glob("*.csv"))
            if not csv_files:
                print(f"No CSV files found in {csv_dir}.")
                conn.commit()
                return

            csv_by_table: dict[str, Path] = {}
            for csv_path in csv_files:
                # Allow case differences in filenames (e.g., Stock_index_price.csv).
                table_name = csv_path.stem.strip().lower()
                csv_by_table[table_name] = csv_path

            existing_tables: list[str] = []
            skipped_files: list[Path] = []
            for table_name, csv_path in csv_by_table.items():
                if get_table_columns(cur, table_name):
                    existing_tables.append(table_name)
                else:
                    skipped_files.append(csv_path)

            for skipped in sorted(skipped_files):
                print(f"[SKIP] {skipped.name}: table '{skipped.stem.lower()}' not found.")

            deps = get_fk_dependencies(cur, existing_tables)
            import_order = topo_sort_tables(existing_tables, deps)

            for table_name in import_order:
                csv_path = csv_by_table[table_name]
                row_count = import_csv_to_table(cur, table_name, csv_path)
                imported_total += row_count
                print(f"[OK] {csv_path.name} -> {table_name}: loaded {row_count} row(s).")

        conn.commit()
        print(f"Initial import completed. Total loaded rows: {imported_total}.")
    except Exception as exc:
        conn.rollback()
        raise RuntimeError(f"Initial import failed: {exc}") from exc
    finally:
        conn.close()


if __name__ == "__main__":
    import_initial_data()
