using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Common;
using UniClub_Hub.Membership.DTOs.Support;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/support")]
    [Authorize]
    public class SupportController : ControllerBase
    {
        private readonly ISupportService _support;

        public SupportController(ISupportService support)
        {
            _support = support;
        }

        // Gửi yêu cầu hỗ trợ — mọi user đã đăng nhập
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSupportTicketDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var ticket = await _support.CreateAsync(userId, dto);
            return Ok(ApiResponse<SupportTicketDto>.Ok(ticket));
        }

        // Xem các ticket của bản thân
        [HttpGet("me")]
        public async Task<IActionResult> GetMine()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var tickets = await _support.GetMyTicketsAsync(userId);
            return Ok(ApiResponse<IEnumerable<SupportTicketDto>>.Ok(tickets));
        }

        // Admin xem tất cả ticket
        [HttpGet]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] string sortBy = "createdAt",
            [FromQuery] string sortDir = "desc",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var tickets = await _support.GetAllAsync(new SupportListQuery
            {
                Search = search,
                Status = status,
                SortBy = sortBy,
                SortDir = sortDir,
                Page = page,
                PageSize = pageSize,
            });
            return Ok(ApiResponse<object>.Ok(tickets));
        }

        // Admin cập nhật trạng thái ticket
        [HttpPatch("{id:int}")]
        [Authorize(Roles = "SUPER_ADMIN")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTicketStatusDto dto)
        {
            var ticket = await _support.UpdateStatusAsync(id, dto);
            return Ok(ApiResponse<SupportTicketDto>.Ok(ticket));
        }
    }
}
