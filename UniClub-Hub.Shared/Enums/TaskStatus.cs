namespace UniClub_Hub.Shared.Enums
{
    public enum ClubTaskStatus
    {
        Todo,
        Doing,
        Done,
        // Appended last so existing stored int values (Todo=0, Doing=1, Done=2)
        // are preserved. Visual ordering is driven by KanbanColumn.SortOrder.
        Reviewing,
    }
}
