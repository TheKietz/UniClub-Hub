using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Position;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId:int}/positions")]
    [Authorize]
    public class ClubPositionsController : ControllerBase
    {
        private readonly IClubPositionService _positions;

        public ClubPositionsController(IClubPositionService positions)
        {
            _positions = positions;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(int clubId, [FromQuery] int? departmentId)
        {
            try
            {
                var result = await _positions.GetAllAsync(
                    clubId,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN"),
                    departmentId
                );

                return Ok(ApiResponse<IReadOnlyList<ClubPositionDto>>.Ok(result));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpGet("{positionId:int}")]
        public async Task<IActionResult> GetById(int clubId, int positionId)
        {
            try
            {
                var result = await _positions.GetByIdAsync(
                    clubId,
                    positionId,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );

                return Ok(ApiResponse<ClubPositionDto>.Ok(result));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPost]
        public async Task<IActionResult> Create(int clubId, [FromBody] CreateClubPositionDto dto)
        {
            try
            {
                var result = await _positions.CreateAsync(
                    clubId,
                    dto,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );

                return Ok(ApiResponse<ClubPositionDto>.Ok(result, "Tạo position thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
            catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPut("{positionId:int}")]
        public async Task<IActionResult> Update(
            int clubId,
            int positionId,
            [FromBody] UpdateClubPositionDto dto
        )
        {
            try
            {
                var result = await _positions.UpdateAsync(
                    clubId,
                    positionId,
                    dto,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );

                return Ok(ApiResponse<ClubPositionDto>.Ok(result, "Cập nhật position thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
            catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpDelete("{positionId:int}")]
        public async Task<IActionResult> Delete(int clubId, int positionId)
        {
            try
            {
                await _positions.DeleteAsync(
                    clubId,
                    positionId,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );

                return Ok(ApiResponse<object>.Ok(null!, "Xóa position thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPut("{positionId:int}/permissions")]
        public async Task<IActionResult> SetPermissions(
            int clubId,
            int positionId,
            [FromBody] UpdateClubPositionPermissionsDto dto
        )
        {
            try
            {
                var result = await _positions.SetPermissionsAsync(
                    clubId,
                    positionId,
                    dto,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );

                return Ok(ApiResponse<ClubPositionDto>.Ok(result, "Cập nhật permission cho position thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (ArgumentException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpGet("~/api/clubs/{clubId:int}/members/{membershipId:int}/positions")]
        public async Task<IActionResult> GetMemberPositions(int clubId, int membershipId)
        {
            try
            {
                var result = await _positions.GetMemberPositionsAsync(
                    clubId,
                    membershipId,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );

                return Ok(ApiResponse<MemberPositionsDto>.Ok(result));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        [HttpPut("~/api/clubs/{clubId:int}/members/{membershipId:int}/positions")]
        public async Task<IActionResult> AssignMemberPositions(
            int clubId,
            int membershipId,
            [FromBody] AssignMemberPositionsDto dto
        )
        {
            try
            {
                var result = await _positions.AssignMemberPositionsAsync(
                    clubId,
                    membershipId,
                    dto,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );

                return Ok(ApiResponse<MemberPositionsDto>.Ok(result, "Cập nhật position cho thành viên thành công."));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ApiResponse<object>.Fail(ex.Message)); }
        }

        private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    }
}
