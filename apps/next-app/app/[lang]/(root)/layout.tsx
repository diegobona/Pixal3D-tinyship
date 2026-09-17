import Header from "@/components/global-header";
import GlobalFooter from "@/components/global-footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <GlobalFooter />
    </>
  );
}
