import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { ProductSearchResult } from "@eatable/shared";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { fetchProducts } from "../../lib/productsApi";
import { useAppTheme } from "../../providers/AppThemeProvider";

export function ProductsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchRevision, setSearchRevision] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(false);
    void fetchProducts(submittedQuery)
      .then((result) => { if (active) setProducts(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [submittedQuery, searchRevision]);

  function submitSearch() {
    setSubmittedQuery(query.trim());
    setSearchRevision((revision) => revision + 1);
  }

  return (
    <AppScreen>
      <Pressable accessibilityLabel={t("app.goToDashboard")} accessibilityRole="button" onPress={() => router.replace("/")} style={styles.backButton}>
        <Text style={styles.backText}>{t("app.back")}</Text>
      </Pressable>
      <Text style={styles.title}>{t("app.productsTitle")}</Text>
      <Text style={styles.description}>{t("app.productsDescription")}</Text>
      <TextInput
        accessibilityLabel={t("app.searchProducts")}
        autoCapitalize="none"
        onChangeText={setQuery}
        onSubmitEditing={submitSearch}
        placeholder={t("app.searchProducts")}
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        style={styles.searchInput}
        value={query}
      />
      <Pressable accessibilityRole="button" disabled={isLoading} onPress={submitSearch} style={styles.lookupButton}>
        <Text style={styles.lookupButtonText}>{t("app.searchProductsButton")}</Text>
      </Pressable>
      {isLoading ? <Text style={styles.message}>{t("app.productsLoading")}</Text> : error ? (
        <Text accessibilityRole="alert" style={styles.error}>{t("errors.productsLoadFailed")}</Text>
      ) : products.length === 0 ? (
        <Text style={styles.message}>{submittedQuery ? t("app.productsNoResults") : t("app.productsEmpty")}</Text>
      ) : (
        <View style={styles.productList}>
          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeading}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
              </View>
              <Text style={styles.nutrition}>{product.calories ?? "—"} kcal · {t("planner.proteinShort")} {product.protein ?? "—"} g · {t("planner.carbohydratesShort")} {product.carbohydrates ?? "—"} g · {t("planner.fatShort")} {product.fat ?? "—"} g</Text>
              {product.nutritionBasis ? <Text style={styles.basis}>{product.nutritionBasis === "100g" ? t("app.per100g") : t("app.per100ml")}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

function createStyles(colors: { border: string; danger: string; muted: string; primary: string; surfaceAlt: string; text: string }) {
  return StyleSheet.create({
    backButton: { alignSelf: "flex-start", justifyContent: "center", minHeight: 28 },
    backText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    title: { color: colors.text, fontSize: 30, fontWeight: "700", letterSpacing: -0.6, marginTop: 18 },
    description: { color: colors.muted, fontSize: 14, marginTop: 6 },
    searchInput: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 50, marginTop: 24, paddingHorizontal: 16 },
    lookupButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 12, justifyContent: "center", minHeight: 48, marginTop: 10, paddingHorizontal: 14 },
    lookupButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
    message: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 24 },
    error: { color: colors.danger, fontSize: 14, lineHeight: 20, marginTop: 24 },
    productList: { gap: 10, marginTop: 16 },
    productCard: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 8, padding: 16 },
    productHeading: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
    productName: { color: colors.text, flexShrink: 1, fontSize: 16, fontWeight: "700" },
    brand: { color: colors.muted, fontSize: 13 },
    nutrition: { color: colors.text, fontSize: 13, lineHeight: 19 },
    basis: { color: colors.muted, fontSize: 11 },
  });
}
