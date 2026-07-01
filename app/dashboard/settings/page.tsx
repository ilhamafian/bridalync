import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  
  export default function Page() {
    return (
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div>
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Example content to preview how pages sit inside the layout.
          </p>
        </div>
  
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming bookings</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">12</p>
            </CardContent>
          </Card>
  
          <Card>
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">$8,420</p>
            </CardContent>
          </Card>
  
          <Card>
            <CardHeader>
              <CardTitle>New inquiries</CardTitle>
              <CardDescription>Awaiting response</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">5</p>
            </CardContent>
          </Card>
        </div>
  
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              A wider card showing how full-width content looks.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Replace this with your real dashboard widgets, tables, or charts.
          </CardContent>
        </Card>
      </div>
    );
  }
  